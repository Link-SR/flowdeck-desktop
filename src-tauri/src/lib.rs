use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    env, fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

const SYNC_FOLDER_NAME: &str = "Flowdeck Sync";
const LOCAL_SYNC_FOLDER_NAME: &str = "Flowdeck Sync Local";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncStatus {
    mode: String,
    path: String,
    is_available: bool,
    message: String,
    last_synced_at: Option<u64>,
}

#[derive(Serialize)]
struct SyncPayload {
    snapshots: Vec<Value>,
    status: SyncStatus,
}

#[derive(Deserialize, Serialize)]
struct SyncConfig {
    directory: Option<String>,
}

fn millis_since_epoch(time: SystemTime) -> Option<u64> {
    time.duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|duration| u64::try_from(duration.as_millis()).ok())
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位 Flowdeck 本地数据目录：{error}"))?;
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建 Flowdeck 本地数据目录：{error}"))?;
    Ok(directory)
}

fn config_path(app_data: &Path) -> PathBuf {
    app_data.join("sync-config.json")
}

fn read_config(app_data: &Path) -> Option<SyncConfig> {
    let contents = fs::read_to_string(config_path(app_data)).ok()?;
    serde_json::from_str(&contents).ok()
}

fn find_onedrive_root() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        for variable in ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"] {
            if let Some(path) = env::var_os(variable).map(PathBuf::from) {
                if path.is_dir() {
                    return Some(path);
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let cloud_storage = env::var_os("HOME")
            .map(PathBuf::from)?
            .join("Library")
            .join("CloudStorage");
        let mut candidates = fs::read_dir(cloud_storage)
            .ok()?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| {
                path.is_dir()
                    && path
                        .file_name()
                        .and_then(|name| name.to_str())
                        .is_some_and(|name| name.starts_with("OneDrive"))
            })
            .collect::<Vec<_>>();
        candidates.sort();
        return candidates.into_iter().next();
    }

    #[allow(unreachable_code)]
    None
}

fn latest_snapshot_millis(root: &Path) -> Option<u64> {
    fs::read_dir(root.join("devices"))
        .ok()?
        .filter_map(Result::ok)
        .filter_map(|entry| entry.metadata().ok()?.modified().ok())
        .filter_map(millis_since_epoch)
        .max()
}

fn status_for(root: &Path, mode: &str, is_available: bool, message: String) -> SyncStatus {
    SyncStatus {
        mode: mode.to_string(),
        path: root.to_string_lossy().into_owned(),
        is_available,
        message,
        last_synced_at: latest_snapshot_millis(root),
    }
}

fn local_fallback(app_data: &Path, reason: Option<String>) -> Result<(PathBuf, SyncStatus), String> {
    let root = app_data.join(LOCAL_SYNC_FOLDER_NAME);
    fs::create_dir_all(root.join("devices"))
        .map_err(|error| format!("无法创建 Flowdeck 本地同步目录：{error}"))?;
    let message = reason.unwrap_or_else(|| {
        "未检测到 OneDrive；修改已安全保存在本机，Flowdeck 会继续自动检测。".to_string()
    });
    let status = status_for(&root, "local", false, message);
    Ok((root, status))
}

fn resolve_sync_location(app: &tauri::AppHandle) -> Result<(PathBuf, SyncStatus), String> {
    let app_data = app_data_dir(app)?;

    if let Some(directory) = read_config(&app_data).and_then(|config| config.directory) {
        let root = PathBuf::from(directory);
        match fs::create_dir_all(root.join("devices")) {
            Ok(()) => {
                let status = status_for(
                    &root,
                    "custom",
                    true,
                    "正在使用手动设置的同步目录。".to_string(),
                );
                return Ok((root, status));
            }
            Err(error) => {
                return local_fallback(
                    &app_data,
                    Some(format!("自定义同步目录暂不可用，已切换到本地备份：{error}")),
                );
            }
        }
    }

    if let Some(onedrive_root) = find_onedrive_root() {
        let root = onedrive_root.join(SYNC_FOLDER_NAME);
        match fs::create_dir_all(root.join("devices")) {
            Ok(()) => {
                let status = status_for(
                    &root,
                    "onedrive",
                    true,
                    "OneDrive 同步目录可用。".to_string(),
                );
                return Ok((root, status));
            }
            Err(error) => {
                return local_fallback(
                    &app_data,
                    Some(format!("OneDrive 目录暂不可写，已切换到本地备份：{error}")),
                );
            }
        }
    }

    local_fallback(&app_data, None)
}

fn device_id(app_data: &Path) -> Result<String, String> {
    let path = app_data.join("device-id");
    if let Ok(existing) = fs::read_to_string(&path) {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    let timestamp = millis_since_epoch(SystemTime::now()).unwrap_or_default();
    let id = format!("device-{timestamp}-{}", std::process::id());
    fs::write(&path, &id).map_err(|error| format!("无法保存设备标识：{error}"))?;
    Ok(id)
}

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("无法创建数据目录：{error}"))?;
    }
    let temporary = path.with_extension("json.tmp");
    let mut file = fs::File::create(&temporary).map_err(|error| format!("无法创建临时数据文件：{error}"))?;
    file.write_all(contents)
        .and_then(|_| file.sync_all())
        .map_err(|error| format!("无法写入临时数据文件：{error}"))?;

    #[cfg(target_os = "windows")]
    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("无法替换旧数据文件：{error}"))?;
    }

    fs::rename(&temporary, path).map_err(|error| format!("无法提交数据文件：{error}"))
}

fn read_snapshot_values(sync_root: &Path, app_data: &Path) -> Vec<Value> {
    let mut paths = fs::read_dir(sync_root.join("devices"))
        .ok()
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|extension| extension.to_str()) == Some("json"))
        .collect::<Vec<_>>();
    paths.sort();
    paths.push(app_data.join("workspace-backup.json"));

    paths
        .into_iter()
        .filter_map(|path| fs::read(path).ok())
        .filter_map(|contents| serde_json::from_slice::<Value>(&contents).ok())
        .collect()
}

#[tauri::command]
fn load_workspace_snapshots(app: tauri::AppHandle) -> Result<SyncPayload, String> {
    let app_data = app_data_dir(&app)?;
    let (sync_root, status) = resolve_sync_location(&app)?;
    Ok(SyncPayload {
        snapshots: read_snapshot_values(&sync_root, &app_data),
        status,
    })
}

#[tauri::command]
fn save_workspace_snapshot(app: tauri::AppHandle, data: Value) -> Result<SyncStatus, String> {
    let app_data = app_data_dir(&app)?;
    let contents = serde_json::to_vec_pretty(&data).map_err(|error| format!("无法序列化工作区数据：{error}"))?;

    atomic_write(&app_data.join("workspace-backup.json"), &contents)?;
    let (sync_root, status) = resolve_sync_location(&app)?;
    let id = device_id(&app_data)?;
    atomic_write(&sync_root.join("devices").join(format!("{id}.json")), &contents)?;

    Ok(status_for(
        &sync_root,
        &status.mode,
        status.is_available,
        status.message,
    ))
}

#[tauri::command]
fn set_sync_directory(app: tauri::AppHandle, directory: Option<String>) -> Result<SyncStatus, String> {
    let app_data = app_data_dir(&app)?;
    let path = config_path(&app_data);
    match directory.map(|value| value.trim().to_string()).filter(|value| !value.is_empty()) {
        Some(directory) => {
            let config = serde_json::to_vec_pretty(&SyncConfig { directory: Some(directory) })
                .map_err(|error| format!("无法序列化同步设置：{error}"))?;
            atomic_write(&path, &config)?;
        }
        None => {
            if path.exists() {
                fs::remove_file(path).map_err(|error| format!("无法重置同步设置：{error}"))?;
            }
        }
    }
    resolve_sync_location(&app).map(|(_, status)| status)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_workspace_snapshots,
            save_workspace_snapshot,
            set_sync_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running Flowdeck");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_directory(name: &str) -> PathBuf {
        env::temp_dir().join(format!(
            "flowdeck-{name}-{}-{}",
            std::process::id(),
            millis_since_epoch(SystemTime::now()).unwrap_or_default()
        ))
    }

    #[test]
    fn atomic_write_replaces_existing_snapshot() {
        let directory = test_directory("atomic");
        let path = directory.join("device.json");
        atomic_write(&path, br#"{"version":2}"#).unwrap();
        atomic_write(&path, br#"{"version":3}"#).unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), r#"{"version":3}"#);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn snapshot_reader_skips_corrupt_files_and_keeps_backup() {
        let sync_root = test_directory("reader-sync");
        let app_data = test_directory("reader-local");
        fs::create_dir_all(sync_root.join("devices")).unwrap();
        fs::create_dir_all(&app_data).unwrap();
        fs::write(sync_root.join("devices/good.json"), br#"{"version":3}"#).unwrap();
        fs::write(sync_root.join("devices/bad.json"), b"not-json").unwrap();
        fs::write(app_data.join("workspace-backup.json"), br#"{"version":2}"#).unwrap();

        let snapshots = read_snapshot_values(&sync_root, &app_data);
        assert_eq!(snapshots.len(), 2);
        assert_eq!(snapshots[0]["version"], 3);
        assert_eq!(snapshots[1]["version"], 2);

        fs::remove_dir_all(sync_root).unwrap();
        fs::remove_dir_all(app_data).unwrap();
    }
}
