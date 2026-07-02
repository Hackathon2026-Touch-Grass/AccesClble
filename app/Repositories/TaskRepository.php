<?php

namespace App\Repositories;

use Framework\Database;
use App\Models\Task;

class TaskRepository implements TaskRepositoryInterface
{
    private Database $database;

    private TagRepositoryInterface $tagRepository;

    public function __construct(Database $database, TagRepositoryInterface $tagRepository)
    {
        $this->database = $database;
        $this->tagRepository = $tagRepository;
    }

    /**
     * @return Task[]
     */
    public function all(): array
    {
        $stmt = $this->database->run("SELECT * FROM tasks ORDER BY title")->fetchAll();
        $tasks = [];
        foreach ($stmt as $row) {
            $task = $this->fromDbRow($row);
            $tasks[] = $task;
        }
        return $tasks;
    }

    public function find(int $id): ?Task
    {
        $stmt = $this->database->run("SELECT * FROM tasks WHERE id = :id", ["id" => $id])->fetch();
        if (!$stmt) {
            return null;
        }
        $task = $this->fromDbRow($stmt);
        return $task;
    }

    /**
     * @param int $projectId
     * @return Task[]
     */
    public function findProjectTasks(int $projectId): array
    {
        $stmt = $this->database->run("SELECT * FROM tasks WHERE project_id = :id", ["id" => $projectId])->fetchAll();
        $tasks = [];
        foreach ($stmt as $row) {
            $task = $this->fromDbRow($row);
            $tasks[] = $task;
        }
        return $tasks;
    }

    public function findByTag(int $tagId): array
    {
        $stmt = $this->database->run(
            "SELECT * FROM tasks 
             JOIN task_tags ON id = task_id 
             WHERE tag_id = :tag_id",
            ["tag_id" => $tagId]
        )->fetchAll();

        $tasks = [];
        foreach ($stmt as $row) {
            $task = $this->fromDbRow($row);
            $tasks[] = $task;
        }
        return $tasks;
    }

    public function insert(Task $task): Task|null
    {
        $stmt = $this->database->run(
            "INSERT INTO tasks (title, description, priority, status, progress, created_at, completed_at, project_id) 
                 VALUES (:title, :description, :priority, :status, :progress, :created_at, :completed_at, :project_id)",
            [
                "title" => $task->title,
                "description" => $task->description,
                "priority" => $task->priority,
                "status" => $task->status,
                "progress" => $task->progress,
                "created_at" => $task->createdAt,
                "completed_at" => $task->completedAt,
                "project_id" => $task->projectId
            ]
        );
        if ($stmt->rowCount() === 0) {
            return null;
        }
        $task->id = $this->database->getLastID();

        $tags = $task->tags ?? [];
        $stmt = $this->database->prepare("INSERT INTO task_tags (task_id, tag_id) VALUES (:task_id, :tag_id)");
        foreach ($tags as $tag) {
            $stmt->execute([
                "task_id" => $task->id,
                "tag_id" => $tag->id
            ]);
        }
        return $task;
    }

    public function update(Task $task): bool
    {
        $stmt = $this->database->run(
            "UPDATE tasks SET title = :title,
                description = :description,
                priority = :priority,
                status = :status,
                progress = :progress,
                created_at = :created_at,
                completed_at = :completed_at,
                project_id = :project_id
             WHERE id = :id",
            [
                "id" => $task->id,
                "title" => $task->title,
                "description" => $task->description,
                "priority" => $task->priority,
                "status" => $task->status,
                "progress" => $task->progress,
                "created_at" => $task->createdAt,
                "completed_at" => $task->completedAt,
                "project_id" => $task->projectId
            ]
        );

        $this->database->run("DELETE FROM task_tags WHERE task_id = :task_id", [
            "task_id" => $task->id
        ]);
        $tags = $task->tags ?? [];
        $stmt = $this->database->prepare("INSERT INTO task_tags (task_id, tag_id) VALUES (:task_id, :tag_id)");
        foreach ($tags as $tag) {
            $stmt->execute([
                "task_id" => $task->id,
                "tag_id" => $tag->id
            ]);
        }

        return $stmt->rowCount() > 0;
    }

    /**
     * @param mixed $row
     * @return Task
     */
    private function fromDbRow(mixed $row): Task
    {
        $task = new Task();
        $task->id = $row->id;
        $task->title = $row->title;
        $task->description = $row->description;
        $task->priority = $row->priority;
        $task->status = $row->status;
        $task->progress = $row->progress;
        $task->createdAt = $row->created_at;
        $task->completedAt = $row->completed_at;
        $task->projectId = $row->project_id;

        $task->tags = $this->tagRepository->findTaskTags($task->id);
        return $task;
    }

    public function delete(Task $task): bool
    {
        $stmt = $this->database->run("DELETE FROM tasks WHERE id = :id", ["id" => $task->id]);

        return $stmt->rowCount() > 0;
    }
}
