use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;
use std::thread;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
struct WatcherState(Mutex<Option<notify::RecommendedWatcher>>);

#[derive(Serialize)]
pub struct FileMetadata {
    name: String,
    line_count: usize,
    modified: u64,
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;

    let modified = metadata
        .modified()
        .map_err(|e| e.to_string())?
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let name = Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(FileMetadata {
        name,
        line_count: content.lines().count(),
        modified,
    })
}

#[tauri::command]
fn get_startup_file() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        let path = Path::new(&args[1]);
        path.canonicalize()
            .map(|p| p.to_string_lossy().to_string())
            .ok()
            .or_else(|| Some(args[1].clone()))
    } else {
        None
    }
}

#[tauri::command]
fn watch_file(
    path: String,
    app: AppHandle,
    state: State<WatcherState>,
) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::channel::<notify::Result<Event>>();

    let mut watcher = recommended_watcher(tx).map_err(|e| e.to_string())?;
    watcher
        .watch(Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Replace old watcher — drops it, closing the old thread's channel
    *state.0.lock().unwrap() = Some(watcher);

    let path_clone = path.clone();
    thread::spawn(move || {
        for result in rx {
            match result {
                Ok(event) => {
                    if matches!(
                        event.kind,
                        notify::EventKind::Modify(_) | notify::EventKind::Create(_)
                    ) {
                        let _ = app.emit("file-changed", &path_clone);
                    }
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            read_file,
            get_file_metadata,
            get_startup_file,
            watch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
