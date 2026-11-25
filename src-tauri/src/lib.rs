use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    env, fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

const SYNC_FOLDER_NAME: &str = "Flowdeck Sync";
const LOCAL_SYNC_FOLDER_NAME: &str = "Flowdeck Sync Local";
const MAX_ATTACHMENT_BYTES: usize = 50 * 1024 * 1024;
const ATTACHMENT_ID_HEADER: &str = "x-flowdeck-attachment-id";
const ALLOWED_ATTACHMENT_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "csv",
    "ppt", "pptx", "txt", "md", "markdown",
];

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

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PendingAttachment {
    name: String,
    size: usize,
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
    let file_name = path.file_name().and_then(|name| name.to_str()).unwrap_or("flowdeck");
    let temporary = path.with_file_name(format!(".{file_name}.tmp"));
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

fn valid_attachment_id(id: &str) -> bool {
    id.starts_with("attachment-")
        && id.len() <= 96
        && id.chars().all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
}

fn validate_attachment_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.len() > 240 {
        return Err("附件名称为空或过长。".to_string());
    }
    let path = Path::new(trimmed);
    if path.components().count() != 1 || path.file_name().and_then(|value| value.to_str()) != Some(trimmed) {
        return Err("附件名称不合法。".to_string());
    }
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| "该文件没有受支持的扩展名。".to_string())?;
    if !ALLOWED_ATTACHMENT_EXTENSIONS.contains(&extension.as_str()) {
        return Err("不支持该附件类型。".to_string());
    }
    Ok(trimmed.to_string())
}

fn attachment_cache_root(app_data: &Path) -> PathBuf {
    app_data.join("attachments")
}

fn attachment_staging_path(app_data: &Path, id: &str) -> PathBuf {
    app_data.join("attachment-staging").join(format!("{id}.json"))
}

fn cached_attachment_path(app_data: &Path, id: &str, name: &str) -> PathBuf {
    attachment_cache_root(app_data).join(id).join(name)
}

fn shared_attachment_path(sync_root: &Path, id: &str) -> PathBuf {
    sync_root.join("attachments").join(id)
}

fn ensure_cached_attachment(app: &tauri::AppHandle, id: &str, name: &str) -> Result<PathBuf, String> {
    if !valid_attachment_id(id) {
        return Err("附件标识不合法。".to_string());
    }
    let name = validate_attachment_name(name)?;
    let app_data = app_data_dir(app)?;
    let cache_path = cached_attachment_path(&app_data, id, &name);
    if cache_path.is_file() {
        return Ok(cache_path);
    }

    let (sync_root, _) = resolve_sync_location(app)?;
    let shared_path = shared_attachment_path(&sync_root, id);
    let contents = fs::read(&shared_path).map_err(|_| "附件尚未同步到此设备，请稍后重试。".to_string())?;
    if contents.len() > MAX_ATTACHMENT_BYTES {
        return Err("附件超过 50 MB，无法读取。".to_string());
    }
    atomic_write(&cache_path, &contents)?;
    Ok(cache_path)
}

fn live_attachment_entries(data: &Value) -> Vec<(String, String)> {
    data.get("attachments")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|attachment| {
            let id = attachment.get("id")?.as_str()?;
            let name = attachment.get("name")?.as_str()?;
            if valid_attachment_id(id) && validate_attachment_name(name).is_ok() {
                Some((id.to_string(), name.to_string()))
            } else {
                None
            }
        })
        .collect()
}

fn deleted_attachment_ids(data: &Value) -> Vec<String> {
    data.pointer("/deleted/attachments")
        .and_then(Value::as_object)
        .into_iter()
        .flat_map(|items| items.keys())
        .filter(|id| valid_attachment_id(id))
        .cloned()
        .collect()
}

fn reconcile_attachment_files(app_data: &Path, sync_root: &Path, data: &Value) -> Result<(), String> {
    for (id, name) in live_attachment_entries(data) {
        let local = cached_attachment_path(app_data, &id, &name);
        let shared = shared_attachment_path(sync_root, &id);
        if local.is_file() && !shared.is_file() {
            let contents = fs::read(&local).map_err(|error| format!("无法读取附件缓存：{error}"))?;
            atomic_write(&shared, &contents)?;
        }
    }

    for id in deleted_attachment_ids(data) {
        let local = attachment_cache_root(app_data).join(&id);
        let shared = shared_attachment_path(sync_root, &id);
        let staging = attachment_staging_path(app_data, &id);
        if local.exists() {
            fs::remove_dir_all(&local).map_err(|error| format!("无法清理本地附件：{error}"))?;
        }
        if shared.exists() {
            fs::remove_file(&shared).map_err(|error| format!("无法清理同步附件：{error}"))?;
        }
        if staging.exists() {
            fs::remove_file(&staging).map_err(|error| format!("无法清理附件暂存信息：{error}"))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn prepare_attachment(app: tauri::AppHandle, id: String, name: String, size: usize) -> Result<String, String> {
    if !valid_attachment_id(&id) {
        return Err("附件标识不合法。".to_string());
    }
    if size > MAX_ATTACHMENT_BYTES {
        return Err("单个附件不能超过 50 MB。".to_string());
    }
    let name = validate_attachment_name(&name)?;
    let app_data = app_data_dir(&app)?;
    let pending = serde_json::to_vec(&PendingAttachment { name: name.clone(), size })
        .map_err(|error| format!("无法准备附件：{error}"))?;
    atomic_write(&attachment_staging_path(&app_data, &id), &pending)?;
    Ok(name)
}

#[tauri::command]
fn write_attachment(app: tauri::AppHandle, request: tauri::ipc::Request) -> Result<(), String> {
    let id = request
        .headers()
        .get(ATTACHMENT_ID_HEADER)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "缺少附件标识。".to_string())?;
    if !valid_attachment_id(id) {
        return Err("附件标识不合法。".to_string());
    }
    let tauri::ipc::InvokeBody::Raw(contents) = request.body() else {
        return Err("附件必须使用二进制方式上传。".to_string());
    };
    let app_data = app_data_dir(&app)?;
    let staging = attachment_staging_path(&app_data, id);
    let pending: PendingAttachment = serde_json::from_slice(
        &fs::read(&staging).map_err(|_| "附件暂存信息不存在，请重新添加。".to_string())?,
    )
    .map_err(|_| "附件暂存信息无效，请重新添加。".to_string())?;
    if contents.len() != pending.size || contents.len() > MAX_ATTACHMENT_BYTES {
        return Err("附件大小与预期不一致。".to_string());
    }
    let cache_path = cached_attachment_path(&app_data, id, &pending.name);
    atomic_write(&cache_path, contents)?;
    let (sync_root, _) = resolve_sync_location(&app)?;
    atomic_write(&shared_attachment_path(&sync_root, id), contents)?;
    fs::remove_file(staging).map_err(|error| format!("无法完成附件暂存：{error}"))?;
    Ok(())
}

#[tauri::command]
fn read_attachment(app: tauri::AppHandle, id: String, name: String) -> Result<tauri::ipc::Response, String> {
    let path = ensure_cached_attachment(&app, &id, &name)?;
    let contents = fs::read(path).map_err(|error| format!("无法读取附件：{error}"))?;
    Ok(tauri::ipc::Response::new(contents))
}

#[tauri::command]
fn open_attachment(app: tauri::AppHandle, id: String, name: String) -> Result<(), String> {
    let path = ensure_cached_attachment(&app, &id, &name)?;
    app.opener()
        .open_path(path.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|error| format!("无法打开附件：{error}"))
}

#[tauri::command]
fn attachment_availability(app: tauri::AppHandle, id: String, name: String) -> Result<String, String> {
    if !valid_attachment_id(&id) {
        return Err("附件标识不合法。".to_string());
    }
    let name = validate_attachment_name(&name)?;
    let app_data = app_data_dir(&app)?;
    let cached = cached_attachment_path(&app_data, &id, &name).is_file();
    let (sync_root, status) = resolve_sync_location(&app)?;
    if shared_attachment_path(&sync_root, &id).is_file() {
        Ok(if status.is_available { "synced" } else { "local" }.to_string())
    } else if cached {
        Ok("local".to_string())
    } else {
        Ok("missing".to_string())
    }
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
    reconcile_attachment_files(&app_data, &sync_root, &data)?;

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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_workspace_snapshots,
            save_workspace_snapshot,
            set_sync_directory,
            prepare_attachment,
            write_attachment,
            read_attachment,
            open_attachment,
            attachment_availability
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

    #[test]
    fn attachment_validation_rejects_unsafe_or_unsupported_names() {
        assert!(valid_attachment_id("attachment-123-abc"));
        assert!(!valid_attachment_id("../attachment-123"));
        assert_eq!(validate_attachment_name("设计稿.PDF").unwrap(), "设计稿.PDF");
        assert!(validate_attachment_name("../secret.pdf").is_err());
        assert!(validate_attachment_name("script.svg").is_err());
        assert!(validate_attachment_name("macro.xlsm").is_err());
    }

    #[test]
    fn attachment_reconcile_copies_live_files_and_cleans_tombstones() {
        let app_data = test_directory("attachment-local");
        let sync_root = test_directory("attachment-sync");
        let live_id = "attachment-live-1";
        let deleted_id = "attachment-deleted-1";
        let live_cache = cached_attachment_path(&app_data, live_id, "notes.pdf");
        let deleted_cache = cached_attachment_path(&app_data, deleted_id, "old.txt");
        atomic_write(&live_cache, b"live").unwrap();
        atomic_write(&deleted_cache, b"deleted").unwrap();
        atomic_write(&shared_attachment_path(&sync_root, deleted_id), b"deleted").unwrap();

        let mut data = serde_json::json!({
            "attachments": [{ "id": live_id, "name": "notes.pdf" }],
            "deleted": { "attachments": {} }
        });
        data["deleted"]["attachments"][deleted_id] = Value::String("2026-11-16T00:00:00.000Z".to_string());
        reconcile_attachment_files(&app_data, &sync_root, &data).unwrap();

        assert_eq!(fs::read(shared_attachment_path(&sync_root, live_id)).unwrap(), b"live");
        assert!(!attachment_cache_root(&app_data).join(deleted_id).exists());
        assert!(!shared_attachment_path(&sync_root, deleted_id).exists());

        fs::remove_dir_all(app_data).unwrap();
        fs::remove_dir_all(sync_root).unwrap();
    }
}
