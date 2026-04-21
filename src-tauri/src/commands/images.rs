use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

/// Get the images directory path, creating it if needed
fn get_images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let images_dir = app_data.join("images");

    if !images_dir.exists() {
        fs::create_dir_all(&images_dir)
            .map_err(|e| format!("Failed to create images directory: {}", e))?;
    }

    Ok(images_dir)
}

/// Save an image from base64 data and return the file path
#[tauri::command]
pub fn save_image(app: AppHandle, base64_data: String, extension: String) -> Result<String, String> {
    let images_dir = get_images_dir(&app)?;

    // Generate unique filename
    let filename = format!("{}.{}", Uuid::new_v4(), extension);
    let file_path = images_dir.join(&filename);

    // Decode base64 and save
    let image_data = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &base64_data
    ).map_err(|e| format!("Failed to decode base64: {}", e))?;

    fs::write(&file_path, image_data)
        .map_err(|e| format!("Failed to write image: {}", e))?;

    // Return the path as a string
    Ok(file_path.to_string_lossy().to_string())
}

/// Get the full path for an image filename
#[tauri::command]
pub fn get_image_path(app: AppHandle, filename: String) -> Result<String, String> {
    let images_dir = get_images_dir(&app)?;
    let file_path = images_dir.join(&filename);

    if !file_path.exists() {
        return Err(format!("Image not found: {}", filename));
    }

    Ok(file_path.to_string_lossy().to_string())
}

/// Delete an image by filename
#[tauri::command]
pub fn delete_image(app: AppHandle, filename: String) -> Result<(), String> {
    let images_dir = get_images_dir(&app)?;
    let file_path = images_dir.join(&filename);

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete image: {}", e))?;
    }

    Ok(())
}

/// List all images in the images directory
#[tauri::command]
pub fn list_images(app: AppHandle) -> Result<Vec<String>, String> {
    let images_dir = get_images_dir(&app)?;

    let entries = fs::read_dir(&images_dir)
        .map_err(|e| format!("Failed to read images directory: {}", e))?;

    let mut images = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Some(filename) = entry.file_name().to_str() {
                images.push(filename.to_string());
            }
        }
    }

    Ok(images)
}

/// Get the images directory URL for use in the frontend
#[tauri::command]
pub fn get_images_dir_url(app: AppHandle) -> Result<String, String> {
    let images_dir = get_images_dir(&app)?;
    Ok(images_dir.to_string_lossy().to_string())
}
