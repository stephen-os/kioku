use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

const PIPER_DOWNLOAD_URL: &str = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PiperVoice {
    pub id: String,
    pub name: String,
    pub language: String,
    pub language_code: String,
    pub size_mb: u32,
    pub is_installed: bool,
    pub download_url: String,
    pub config_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub id: String,
    pub progress: f32,
    pub message: String,
}

/// Get the Piper directory path
fn get_piper_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join("piper"))
}

/// Get the voices directory path
fn get_voices_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(get_piper_dir(app)?.join("voices"))
}

/// Check if Piper engine is installed
#[tauri::command]
pub async fn is_piper_installed(app: AppHandle) -> Result<bool, String> {
    let piper_dir = get_piper_dir(&app)?;
    let piper_exe = piper_dir.join("piper.exe");
    Ok(piper_exe.exists())
}

/// Get the list of available voices with their installation status
#[tauri::command]
pub async fn get_piper_voices(app: AppHandle) -> Result<Vec<PiperVoice>, String> {
    let voices_dir = get_voices_dir(&app)?;

    // Define available voices
    let voices = vec![
        PiperVoice {
            id: "en_US".to_string(),
            name: "English (US)".to_string(),
            language: "English".to_string(),
            language_code: "en_US".to_string(),
            size_mb: 75,
            is_installed: voices_dir.join("en_US-amy-medium.onnx").exists(),
            download_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx".to_string(),
            config_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json".to_string(),
        },
        PiperVoice {
            id: "en_GB".to_string(),
            name: "English (UK)".to_string(),
            language: "English".to_string(),
            language_code: "en_GB".to_string(),
            size_mb: 75,
            is_installed: voices_dir.join("en_GB-alba-medium.onnx").exists(),
            download_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx".to_string(),
            config_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx.json".to_string(),
        },
        PiperVoice {
            id: "es_ES".to_string(),
            name: "Spanish (Spain)".to_string(),
            language: "Spanish".to_string(),
            language_code: "es_ES".to_string(),
            size_mb: 68,
            is_installed: voices_dir.join("es_ES-davefx-medium.onnx").exists(),
            download_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx".to_string(),
            config_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx.json".to_string(),
        },
        PiperVoice {
            id: "fr_FR".to_string(),
            name: "French".to_string(),
            language: "French".to_string(),
            language_code: "fr_FR".to_string(),
            size_mb: 71,
            is_installed: voices_dir.join("fr_FR-upmc-medium.onnx").exists(),
            download_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx".to_string(),
            config_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx.json".to_string(),
        },
        PiperVoice {
            id: "de_DE".to_string(),
            name: "German".to_string(),
            language: "German".to_string(),
            language_code: "de_DE".to_string(),
            size_mb: 73,
            is_installed: voices_dir.join("de_DE-thorsten-medium.onnx").exists(),
            download_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx".to_string(),
            config_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json".to_string(),
        },
        PiperVoice {
            id: "zh_CN".to_string(),
            name: "Chinese (Mandarin)".to_string(),
            language: "Chinese".to_string(),
            language_code: "zh_CN".to_string(),
            size_mb: 85,
            is_installed: voices_dir.join("zh_CN-huayan-medium.onnx").exists(),
            download_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx".to_string(),
            config_url: "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json".to_string(),
        },
    ];

    Ok(voices)
}

/// Install the Piper engine
#[tauri::command]
pub async fn install_piper(app: AppHandle) -> Result<(), String> {
    let piper_dir = get_piper_dir(&app)?;
    let voices_dir = get_voices_dir(&app)?;

    // Create directories
    fs::create_dir_all(&piper_dir).map_err(|e| format!("Failed to create piper dir: {}", e))?;
    fs::create_dir_all(&voices_dir).map_err(|e| format!("Failed to create voices dir: {}", e))?;

    // Emit starting progress
    let _ = app.emit("piper-download-progress", DownloadProgress {
        id: "piper".to_string(),
        progress: 0.0,
        message: "Starting download...".to_string(),
    });

    // Download Piper
    let client = reqwest::Client::new();
    let response = client
        .get(PIPER_DOWNLOAD_URL)
        .send()
        .await
        .map_err(|e| format!("Failed to download Piper: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    let zip_path = piper_dir.join("piper.zip");
    let mut file = fs::File::create(&zip_path)
        .map_err(|e| format!("Failed to create zip file: {}", e))?;

    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        downloaded += chunk.len() as u64;
        let progress = if total_size > 0 {
            (downloaded as f32 / total_size as f32) * 0.8 // 80% for download
        } else {
            0.5
        };

        let _ = app.emit("piper-download-progress", DownloadProgress {
            id: "piper".to_string(),
            progress,
            message: format!("Downloading... {:.1} MB", downloaded as f64 / 1_000_000.0),
        });
    }

    drop(file);

    // Extract zip
    let _ = app.emit("piper-download-progress", DownloadProgress {
        id: "piper".to_string(),
        progress: 0.85,
        message: "Extracting...".to_string(),
    });

    let zip_file = fs::File::open(&zip_path)
        .map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| format!("Failed to read zip: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {}", e))?;

        // Skip directories and parent paths in zip
        let name = file.name().to_string();
        if name.ends_with('/') {
            continue;
        }

        // Extract only the filename (flatten the directory structure)
        let file_name = std::path::Path::new(&name)
            .file_name()
            .unwrap_or_default()
            .to_str()
            .unwrap_or_default();

        if file_name.is_empty() {
            continue;
        }

        let out_path = piper_dir.join(file_name);
        let mut out_file = fs::File::create(&out_path)
            .map_err(|e| format!("Failed to create file {}: {}", file_name, e))?;

        std::io::copy(&mut file, &mut out_file)
            .map_err(|e| format!("Failed to extract {}: {}", file_name, e))?;
    }

    // Clean up zip
    let _ = fs::remove_file(&zip_path);

    let _ = app.emit("piper-download-progress", DownloadProgress {
        id: "piper".to_string(),
        progress: 1.0,
        message: "Complete!".to_string(),
    });

    Ok(())
}

/// Uninstall the Piper engine (keeps voice models)
#[tauri::command]
pub async fn uninstall_piper(app: AppHandle) -> Result<(), String> {
    let piper_dir = get_piper_dir(&app)?;

    // Remove piper executable and related files, but keep voices directory
    let files_to_remove = ["piper.exe", "espeak-ng-data", "piper_phonemize.dll", "onnxruntime.dll"];

    for file in files_to_remove {
        let path = piper_dir.join(file);
        if path.is_dir() {
            let _ = fs::remove_dir_all(&path);
        } else if path.exists() {
            let _ = fs::remove_file(&path);
        }
    }

    Ok(())
}

/// Download a voice model
#[tauri::command]
pub async fn download_voice(app: AppHandle, voice_id: String) -> Result<(), String> {
    let voices = get_piper_voices(app.clone()).await?;
    let voice = voices
        .iter()
        .find(|v| v.id == voice_id)
        .ok_or_else(|| format!("Voice not found: {}", voice_id))?;

    let voices_dir = get_voices_dir(&app)?;
    fs::create_dir_all(&voices_dir).map_err(|e| format!("Failed to create voices dir: {}", e))?;

    // Download model file
    let _ = app.emit("piper-download-progress", DownloadProgress {
        id: voice_id.clone(),
        progress: 0.0,
        message: "Starting download...".to_string(),
    });

    let client = reqwest::Client::new();

    // Download ONNX model
    let response = client
        .get(&voice.download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download voice model: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    // Extract filename from URL
    let model_filename = voice
        .download_url
        .split('/')
        .last()
        .unwrap_or("model.onnx");

    let model_path = voices_dir.join(model_filename);
    let mut file = fs::File::create(&model_path)
        .map_err(|e| format!("Failed to create model file: {}", e))?;

    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        downloaded += chunk.len() as u64;
        let progress = if total_size > 0 {
            (downloaded as f32 / total_size as f32) * 0.9 // 90% for model
        } else {
            0.5
        };

        let _ = app.emit("piper-download-progress", DownloadProgress {
            id: voice_id.clone(),
            progress,
            message: format!("Downloading... {:.1} MB", downloaded as f64 / 1_000_000.0),
        });
    }

    drop(file);

    // Download config file
    let _ = app.emit("piper-download-progress", DownloadProgress {
        id: voice_id.clone(),
        progress: 0.92,
        message: "Downloading config...".to_string(),
    });

    let config_response = client
        .get(&voice.config_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download config: {}", e))?;

    let config_bytes = config_response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let config_filename = format!("{}.json", model_filename);
    let config_path = voices_dir.join(config_filename);
    fs::write(&config_path, &config_bytes)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    let _ = app.emit("piper-download-progress", DownloadProgress {
        id: voice_id,
        progress: 1.0,
        message: "Complete!".to_string(),
    });

    Ok(())
}

/// Delete a voice model
#[tauri::command]
pub async fn delete_voice(app: AppHandle, voice_id: String) -> Result<(), String> {
    let voices = get_piper_voices(app.clone()).await?;
    let voice = voices
        .iter()
        .find(|v| v.id == voice_id)
        .ok_or_else(|| format!("Voice not found: {}", voice_id))?;

    let voices_dir = get_voices_dir(&app)?;

    // Get the model filename from URL
    let model_filename = voice
        .download_url
        .split('/')
        .last()
        .unwrap_or("");

    if !model_filename.is_empty() {
        let model_path = voices_dir.join(model_filename);
        let config_path = voices_dir.join(format!("{}.json", model_filename));

        if model_path.exists() {
            fs::remove_file(&model_path)
                .map_err(|e| format!("Failed to delete model: {}", e))?;
        }

        if config_path.exists() {
            fs::remove_file(&config_path)
                .map_err(|e| format!("Failed to delete config: {}", e))?;
        }
    }

    Ok(())
}

/// Get total size of installed voices in bytes
#[tauri::command]
pub async fn get_piper_storage_size(app: AppHandle) -> Result<u64, String> {
    let piper_dir = get_piper_dir(&app)?;

    if !piper_dir.exists() {
        return Ok(0);
    }

    fn dir_size(path: &PathBuf) -> u64 {
        let mut size = 0;
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    size += dir_size(&path);
                } else if let Ok(meta) = path.metadata() {
                    size += meta.len();
                }
            }
        }
        size
    }

    Ok(dir_size(&piper_dir))
}
