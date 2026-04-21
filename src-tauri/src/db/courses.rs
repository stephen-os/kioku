use rusqlite::{params, Connection};
use uuid::Uuid;

use super::models::{Course, Lesson, LessonItem, LessonItemType, LessonProgress, RequirementType};

// ============================================
// Course Operations
// ============================================

pub fn create_course(
    conn: &Connection,
    user_id: &str,
    name: &str,
    description: Option<&str>,
) -> Result<Course, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO courses (id, user_id, name, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, user_id, name, description, now, now],
    )
    .map_err(|e| format!("Failed to create course: {}", e))?;

    get_course(conn, user_id, &id)?
        .ok_or_else(|| "Failed to retrieve created course".to_string())
}

pub fn get_all_courses(conn: &Connection, user_id: &str) -> Result<Vec<Course>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.user_id, c.name, c.description, c.created_at, c.updated_at,
                    (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count,
                    (SELECT COUNT(DISTINCT l.id) FROM lessons l
                     JOIN lesson_items li ON li.lesson_id = l.id
                     WHERE l.course_id = c.id
                     AND NOT EXISTS (
                         SELECT 1 FROM lesson_items li2
                         WHERE li2.lesson_id = l.id
                         AND NOT EXISTS (
                             SELECT 1 FROM lesson_progress lp
                             WHERE lp.lesson_item_id = li2.id AND lp.user_id = ?1 AND lp.completed_at IS NOT NULL
                         )
                     )
                    ) as completed_lesson_count,
                    EXISTS(SELECT 1 FROM course_favorites WHERE course_id = c.id AND user_id = ?1) as is_favorite
             FROM courses c WHERE c.user_id = ?1 ORDER BY c.updated_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let courses = stmt
        .query_map(params![user_id], |row| {
            Ok(Course {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                lesson_count: Some(row.get(6)?),
                completed_lesson_count: Some(row.get(7)?),
                is_favorite: Some(row.get::<_, i32>(8)? == 1),
                lessons: vec![],
            })
        })
        .map_err(|e| format!("Failed to query courses: {}", e))?;

    courses
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect courses: {}", e))
}

pub fn get_course(conn: &Connection, user_id: &str, id: &str) -> Result<Option<Course>, String> {
    match conn.query_row(
        "SELECT c.id, c.user_id, c.name, c.description, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count,
                EXISTS(SELECT 1 FROM course_favorites WHERE course_id = c.id AND user_id = ?1) as is_favorite
         FROM courses c WHERE c.id = ?2",
        params![user_id, id],
        |row| {
            Ok(Course {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                lesson_count: Some(row.get(6)?),
                completed_lesson_count: None, // Will be calculated when loading lessons
                is_favorite: Some(row.get::<_, i32>(7)? == 1),
                lessons: vec![],
            })
        },
    ) {
        Ok(course) => Ok(Some(course)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

pub fn get_course_with_lessons(conn: &Connection, user_id: &str, id: &str) -> Result<Option<Course>, String> {
    let course = match get_course(conn, user_id, id)? {
        Some(c) => c,
        None => return Ok(None),
    };

    let lessons = get_lessons(conn, user_id, id)?;

    // Calculate completed lessons count
    let completed_count = lessons.iter()
        .filter(|l| l.is_completed.unwrap_or(false))
        .count() as i32;

    Ok(Some(Course {
        lessons,
        completed_lesson_count: Some(completed_count),
        ..course
    }))
}

pub fn update_course(
    conn: &Connection,
    user_id: &str,
    id: &str,
    name: &str,
    description: Option<&str>,
) -> Result<Course, String> {
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE courses SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
        params![name, description, now, id],
    )
    .map_err(|e| format!("Failed to update course: {}", e))?;

    get_course(conn, user_id, id)?
        .ok_or_else(|| format!("Course not found after update: {}", id))
}

pub fn delete_course(conn: &Connection, user_id: &str, id: &str) -> Result<(), String> {
    let rows_affected = conn
        .execute(
            "DELETE FROM courses WHERE id = ?1 AND user_id = ?2",
            params![id, user_id],
        )
        .map_err(|e| format!("Failed to delete course: {}", e))?;

    if rows_affected == 0 {
        return Err("Course not found or access denied".to_string());
    }
    Ok(())
}

// ============================================
// Lesson Operations
// ============================================

pub fn create_lesson(
    conn: &Connection,
    course_id: &str,
    title: &str,
    description: Option<&str>,
    position: Option<i32>,
) -> Result<Lesson, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Get the next position if not specified
    let pos = match position {
        Some(p) => p,
        None => {
            let max_pos: i32 = conn
                .query_row(
                    "SELECT COALESCE(MAX(position), -1) FROM lessons WHERE course_id = ?1",
                    params![course_id],
                    |row| row.get(0),
                )
                .unwrap_or(-1);
            max_pos + 1
        }
    };

    conn.execute(
        "INSERT INTO lessons (id, course_id, title, description, position, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, course_id, title, description, pos, now, now],
    )
    .map_err(|e| format!("Failed to create lesson: {}", e))?;

    // Update course's updated_at
    conn.execute(
        "UPDATE courses SET updated_at = ?1 WHERE id = ?2",
        params![now, course_id],
    )
    .ok();

    Ok(Lesson {
        id,
        course_id: course_id.to_string(),
        title: title.to_string(),
        description: description.map(|s| s.to_string()),
        position: pos,
        created_at: now.clone(),
        updated_at: now,
        items: vec![],
        is_completed: Some(false),
        completed_item_count: Some(0),
    })
}

pub fn get_lessons(conn: &Connection, user_id: &str, course_id: &str) -> Result<Vec<Lesson>, String> {
    use std::collections::HashMap;

    // Query 1: Get all lessons for the course
    let mut stmt = conn
        .prepare(
            "SELECT id, course_id, title, description, position, created_at, updated_at
             FROM lessons
             WHERE course_id = ?1
             ORDER BY position ASC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let mut lessons: Vec<Lesson> = stmt
        .query_map(params![course_id], |row| {
            Ok(Lesson {
                id: row.get(0)?,
                course_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                position: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                items: vec![],
                is_completed: None,
                completed_item_count: None,
            })
        })
        .map_err(|e| format!("Failed to query lessons: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect lessons: {}", e))?;

    // Query 2: Get all lesson items for all lessons in this course (single query instead of N)
    let mut items_stmt = conn
        .prepare(
            "SELECT li.lesson_id, li.id, li.item_type, li.item_id, li.item_name,
                    li.requirement_type, li.requirement_value, li.position, li.created_at,
                    lp.completed_at IS NOT NULL as is_completed,
                    li.item_id IS NULL as is_missing,
                    lp.score_percentage as best_score
             FROM lesson_items li
             INNER JOIN lessons l ON l.id = li.lesson_id
             LEFT JOIN lesson_progress lp ON lp.lesson_item_id = li.id AND lp.user_id = ?1
             WHERE l.course_id = ?2
             ORDER BY li.position ASC",
        )
        .map_err(|e| format!("Failed to prepare items query: {}", e))?;

    let mut items_by_lesson: HashMap<String, Vec<LessonItem>> = HashMap::new();
    let items_iter = items_stmt
        .query_map(params![user_id, course_id], |row| {
            let lesson_id: String = row.get(0)?;
            let item_type_str: String = row.get(2)?;
            let req_type_str: Option<String> = row.get(5)?;
            Ok((
                lesson_id,
                LessonItem {
                    id: row.get(1)?,
                    lesson_id: row.get(0)?,
                    item_type: LessonItemType::from_str(&item_type_str),
                    item_id: row.get(3)?,
                    item_name: row.get(4)?,
                    requirement_type: req_type_str.and_then(|s| RequirementType::from_str(&s)),
                    requirement_value: row.get(6)?,
                    position: row.get(7)?,
                    created_at: row.get(8)?,
                    is_completed: Some(row.get::<_, i32>(9)? == 1),
                    is_missing: Some(row.get::<_, i32>(10)? == 1),
                    best_score: row.get(11)?,
                },
            ))
        })
        .map_err(|e| format!("Failed to query items: {}", e))?;

    for item_result in items_iter {
        let (lesson_id, item) = item_result.map_err(|e| format!("Failed to read item: {}", e))?;
        items_by_lesson.entry(lesson_id).or_default().push(item);
    }

    // Assign items to lessons and calculate completion
    for lesson in &mut lessons {
        let items = items_by_lesson.remove(&lesson.id).unwrap_or_default();
        let completed_count = items.iter()
            .filter(|i| i.is_completed.unwrap_or(false))
            .count() as i32;
        let all_completed = !items.is_empty() && items.iter().all(|i| i.is_completed.unwrap_or(false));

        lesson.items = items;
        lesson.completed_item_count = Some(completed_count);
        lesson.is_completed = Some(all_completed);
    }

    Ok(lessons)
}

pub fn get_lesson(conn: &Connection, user_id: &str, lesson_id: &str) -> Result<Option<Lesson>, String> {
    match conn.query_row(
        "SELECT id, course_id, title, description, position, created_at, updated_at
         FROM lessons WHERE id = ?1",
        params![lesson_id],
        |row| {
            Ok(Lesson {
                id: row.get(0)?,
                course_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                position: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                items: vec![],
                is_completed: None,
                completed_item_count: None,
            })
        },
    ) {
        Ok(mut lesson) => {
            let items = get_lesson_items(conn, user_id, &lesson.id)?;
            let completed_count = items.iter()
                .filter(|i| i.is_completed.unwrap_or(false))
                .count() as i32;
            let all_completed = !items.is_empty() && items.iter().all(|i| i.is_completed.unwrap_or(false));

            lesson.items = items;
            lesson.completed_item_count = Some(completed_count);
            lesson.is_completed = Some(all_completed);
            Ok(Some(lesson))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

pub fn update_lesson(
    conn: &Connection,
    lesson_id: &str,
    title: &str,
    description: Option<&str>,
) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE lessons SET title = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
        params![title, description, now, lesson_id],
    )
    .map_err(|e| format!("Failed to update lesson: {}", e))?;

    // Update course's updated_at
    conn.execute(
        "UPDATE courses SET updated_at = ?1 WHERE id = (SELECT course_id FROM lessons WHERE id = ?2)",
        params![now, lesson_id],
    )
    .ok();

    Ok(())
}

pub fn delete_lesson(conn: &Connection, lesson_id: &str) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Get course_id before deleting
    let course_id: String = conn
        .query_row(
            "SELECT course_id FROM lessons WHERE id = ?1",
            params![lesson_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get course_id: {}", e))?;

    conn.execute("DELETE FROM lessons WHERE id = ?1", params![lesson_id])
        .map_err(|e| format!("Failed to delete lesson: {}", e))?;

    // Update course's updated_at
    conn.execute(
        "UPDATE courses SET updated_at = ?1 WHERE id = ?2",
        params![now, course_id],
    )
    .ok();

    Ok(())
}

pub fn reorder_lessons(conn: &Connection, course_id: &str, lesson_ids: &[String]) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    for (i, lesson_id) in lesson_ids.iter().enumerate() {
        conn.execute(
            "UPDATE lessons SET position = ?1, updated_at = ?2 WHERE id = ?3 AND course_id = ?4",
            params![i as i32, now, lesson_id, course_id],
        )
        .map_err(|e| format!("Failed to reorder lesson: {}", e))?;
    }

    // Update course's updated_at
    conn.execute(
        "UPDATE courses SET updated_at = ?1 WHERE id = ?2",
        params![now, course_id],
    )
    .ok();

    Ok(())
}

// ============================================
// Lesson Item Operations
// ============================================

pub fn get_lesson_items(conn: &Connection, user_id: &str, lesson_id: &str) -> Result<Vec<LessonItem>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT li.id, li.lesson_id, li.item_type, li.item_id, li.item_name,
                    li.requirement_type, li.requirement_value, li.position, li.created_at,
                    lp.completed_at IS NOT NULL as is_completed,
                    li.item_id IS NULL as is_missing,
                    lp.score_percentage as best_score
             FROM lesson_items li
             LEFT JOIN lesson_progress lp ON lp.lesson_item_id = li.id AND lp.user_id = ?1
             WHERE li.lesson_id = ?2
             ORDER BY li.position ASC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let items = stmt
        .query_map(params![user_id, lesson_id], |row| {
            let item_type_str: String = row.get(2)?;
            let req_type_str: Option<String> = row.get(5)?;
            Ok(LessonItem {
                id: row.get(0)?,
                lesson_id: row.get(1)?,
                item_type: LessonItemType::from_str(&item_type_str),
                item_id: row.get(3)?,
                item_name: row.get(4)?,
                requirement_type: req_type_str.and_then(|s| RequirementType::from_str(&s)),
                requirement_value: row.get(6)?,
                position: row.get(7)?,
                created_at: row.get(8)?,
                is_completed: Some(row.get::<_, i32>(9)? == 1),
                is_missing: Some(row.get::<_, i32>(10)? == 1),
                best_score: row.get(11)?,
            })
        })
        .map_err(|e| format!("Failed to query lesson items: {}", e))?;

    items
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect lesson items: {}", e))
}

pub fn add_lesson_item(
    conn: &Connection,
    lesson_id: &str,
    item_type: &str,
    item_name: &str,
    item_id: Option<&str>,
    requirement_type: Option<&str>,
    requirement_value: Option<i32>,
    position: Option<i32>,
) -> Result<LessonItem, String> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Get the next position if not specified
    let pos = match position {
        Some(p) => p,
        None => {
            let max_pos: i32 = conn
                .query_row(
                    "SELECT COALESCE(MAX(position), -1) FROM lesson_items WHERE lesson_id = ?1",
                    params![lesson_id],
                    |row| row.get(0),
                )
                .unwrap_or(-1);
            max_pos + 1
        }
    };

    conn.execute(
        "INSERT INTO lesson_items (id, lesson_id, item_type, item_id, item_name, requirement_type, requirement_value, position, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, lesson_id, item_type, item_id, item_name, requirement_type, requirement_value, pos, now],
    )
    .map_err(|e| format!("Failed to add lesson item: {}", e))?;

    // Update lesson's and course's updated_at
    conn.execute(
        "UPDATE lessons SET updated_at = ?1 WHERE id = ?2",
        params![now, lesson_id],
    )
    .ok();

    conn.execute(
        "UPDATE courses SET updated_at = ?1 WHERE id = (SELECT course_id FROM lessons WHERE id = ?2)",
        params![now, lesson_id],
    )
    .ok();

    Ok(LessonItem {
        id,
        lesson_id: lesson_id.to_string(),
        item_type: LessonItemType::from_str(item_type),
        item_id: item_id.map(|s| s.to_string()),
        item_name: item_name.to_string(),
        requirement_type: requirement_type.and_then(|s| RequirementType::from_str(s)),
        requirement_value,
        position: pos,
        created_at: now,
        is_completed: Some(false),
        is_missing: Some(item_id.is_none()),
        best_score: None,
    })
}

pub fn update_lesson_item_reference(
    conn: &Connection,
    lesson_item_id: &str,
    item_id: &str,
) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE lesson_items SET item_id = ?1 WHERE id = ?2",
        params![item_id, lesson_item_id],
    )
    .map_err(|e| format!("Failed to update lesson item reference: {}", e))?;

    // Update timestamps
    conn.execute(
        "UPDATE lessons SET updated_at = ?1 WHERE id = (SELECT lesson_id FROM lesson_items WHERE id = ?2)",
        params![now, lesson_item_id],
    )
    .ok();

    Ok(())
}

pub fn remove_lesson_item(conn: &Connection, lesson_item_id: &str) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Get lesson_id before deleting
    let lesson_id: String = conn
        .query_row(
            "SELECT lesson_id FROM lesson_items WHERE id = ?1",
            params![lesson_item_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get lesson_id: {}", e))?;

    conn.execute(
        "DELETE FROM lesson_items WHERE id = ?1",
        params![lesson_item_id],
    )
    .map_err(|e| format!("Failed to remove lesson item: {}", e))?;

    // Update timestamps
    conn.execute(
        "UPDATE lessons SET updated_at = ?1 WHERE id = ?2",
        params![now, lesson_id],
    )
    .ok();

    Ok(())
}

pub fn reorder_lesson_items(conn: &Connection, lesson_id: &str, item_ids: &[String]) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();

    for (i, item_id) in item_ids.iter().enumerate() {
        conn.execute(
            "UPDATE lesson_items SET position = ?1 WHERE id = ?2 AND lesson_id = ?3",
            params![i as i32, item_id, lesson_id],
        )
        .map_err(|e| format!("Failed to reorder lesson item: {}", e))?;
    }

    // Update timestamps
    conn.execute(
        "UPDATE lessons SET updated_at = ?1 WHERE id = ?2",
        params![now, lesson_id],
    )
    .ok();

    Ok(())
}

// ============================================
// Lesson Progress Operations
// ============================================

pub fn record_lesson_progress(
    conn: &Connection,
    user_id: &str,
    course_id: &str,
    lesson_id: &str,
    lesson_item_id: &str,
    score_percentage: Option<i32>,
    attempt_id: Option<&str>,
    session_id: Option<&str>,
) -> Result<LessonProgress, String> {
    let now = chrono::Utc::now().to_rfc3339();

    // Check if progress already exists
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM lesson_progress WHERE user_id = ?1 AND lesson_item_id = ?2",
            params![user_id, lesson_item_id],
            |row| row.get(0),
        )
        .ok();

    let id = if let Some(existing_id) = existing {
        // Update existing progress
        conn.execute(
            "UPDATE lesson_progress SET completed_at = ?1, score_percentage = COALESCE(?2, score_percentage),
             attempt_id = COALESCE(?3, attempt_id), session_id = COALESCE(?4, session_id), updated_at = ?5
             WHERE id = ?6",
            params![now, score_percentage, attempt_id, session_id, now, existing_id],
        )
        .map_err(|e| format!("Failed to update lesson progress: {}", e))?;
        existing_id
    } else {
        // Create new progress
        let new_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO lesson_progress (id, user_id, course_id, lesson_id, lesson_item_id, completed_at, score_percentage, attempt_id, session_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![new_id, user_id, course_id, lesson_id, lesson_item_id, now, score_percentage, attempt_id, session_id, now, now],
        )
        .map_err(|e| format!("Failed to create lesson progress: {}", e))?;
        new_id
    };

    Ok(LessonProgress {
        id,
        user_id: user_id.to_string(),
        course_id: course_id.to_string(),
        lesson_id: lesson_id.to_string(),
        lesson_item_id: lesson_item_id.to_string(),
        completed_at: Some(now.clone()),
        score_percentage,
        attempt_id: attempt_id.map(|s| s.to_string()),
        session_id: session_id.map(|s| s.to_string()),
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn clear_lesson_item_progress(
    conn: &Connection,
    user_id: &str,
    lesson_item_id: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM lesson_progress WHERE user_id = ?1 AND lesson_item_id = ?2",
        params![user_id, lesson_item_id],
    )
    .map_err(|e| format!("Failed to clear lesson progress: {}", e))?;

    Ok(())
}

pub fn get_lesson_progress(
    conn: &Connection,
    user_id: &str,
    course_id: &str,
) -> Result<Vec<LessonProgress>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, user_id, course_id, lesson_id, lesson_item_id, completed_at,
                    score_percentage, attempt_id, session_id, created_at, updated_at
             FROM lesson_progress
             WHERE user_id = ?1 AND course_id = ?2",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let progress = stmt
        .query_map(params![user_id, course_id], |row| {
            Ok(LessonProgress {
                id: row.get(0)?,
                user_id: row.get(1)?,
                course_id: row.get(2)?,
                lesson_id: row.get(3)?,
                lesson_item_id: row.get(4)?,
                completed_at: row.get(5)?,
                score_percentage: row.get(6)?,
                attempt_id: row.get(7)?,
                session_id: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Failed to query lesson progress: {}", e))?;

    progress
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect lesson progress: {}", e))
}

// ============================================
// Course Favorites
// ============================================

pub fn toggle_course_favorite(conn: &Connection, user_id: &str, course_id: &str) -> Result<bool, String> {
    let is_favorite: bool = conn
        .query_row(
            "SELECT 1 FROM course_favorites WHERE user_id = ?1 AND course_id = ?2",
            params![user_id, course_id],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if is_favorite {
        conn.execute(
            "DELETE FROM course_favorites WHERE user_id = ?1 AND course_id = ?2",
            params![user_id, course_id],
        )
        .map_err(|e| format!("Failed to remove course favorite: {}", e))?;
        Ok(false)
    } else {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO course_favorites (user_id, course_id, created_at) VALUES (?1, ?2, ?3)",
            params![user_id, course_id, now],
        )
        .map_err(|e| format!("Failed to add course favorite: {}", e))?;
        Ok(true)
    }
}

// ============================================
// Utility: Link items by name
// ============================================

pub fn link_lesson_items_by_name(
    conn: &Connection,
    user_id: &str,
    course_id: &str,
) -> Result<(i32, Vec<String>), String> {
    // Get all lesson items for this course that are missing (item_id is NULL)
    let mut stmt = conn
        .prepare(
            "SELECT li.id, li.item_type, li.item_name
             FROM lesson_items li
             JOIN lessons l ON l.id = li.lesson_id
             WHERE l.course_id = ?1 AND li.item_id IS NULL",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let missing_items: Vec<(String, String, String)> = stmt
        .query_map(params![course_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| format!("Failed to query missing items: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    let mut linked = 0;
    let mut not_found = Vec::new();

    for (item_id, item_type, item_name) in missing_items {
        let found_id: Option<String> = match item_type.as_str() {
            "deck" => conn
                .query_row(
                    "SELECT id FROM decks WHERE user_id = ?1 AND name = ?2",
                    params![user_id, item_name],
                    |row| row.get(0),
                )
                .ok(),
            "quiz" => conn
                .query_row(
                    "SELECT id FROM quizzes WHERE user_id = ?1 AND name = ?2",
                    params![user_id, item_name],
                    |row| row.get(0),
                )
                .ok(),
            _ => None,
        };

        if let Some(ref_id) = found_id {
            update_lesson_item_reference(conn, &item_id, &ref_id)?;
            linked += 1;
        } else {
            not_found.push(format!("{}: {}", item_type, item_name));
        }
    }

    Ok((linked, not_found))
}
