<?php

namespace App\Repositories;

use Framework\Database;
use App\Models\Project;

class ProjectRepository implements ProjectRepositoryInterface
{
    private Database $database;

    public function __construct(Database $database)
    {
        $this->database = $database;
    }

    /**
     * @return Project[]
     */
    public function all(): array
    {
        $stmt = $this->database->run("SELECT * FROM projects")->fetchAll();
        $projects = [];
        foreach ($stmt as $row) {
            $project = $this->fromDbRow($row, false);
            $projects[] = $project;
        }
        return $projects;
    }

    public function insert(Project $project): Project
    {
        $stmt = $this->database->run("INSERT INTO projects (title, description) VALUES (:title, :description)", [
            "title" => $project->title,
            "description" => $project->description
        ]);
        $project->id = $this->database->getLastID();
        return $project;
    }

    public function update(Project $project): Project
    {
        $stmt = $this->database->run("UPDATE projects SET title = :title, description = :description WHERE id = :id", [
            "title" => $project->title,
            "description" => $project->description,
            "id" => $project->id
        ]);
        return $project;
    }

    public function find(int $id): ?Project
    {
        $stmt = $this->database->run("SELECT * FROM projects WHERE id = :id", ["id" => $id])->fetch();
        if (!$stmt) {
            return null;
        }
        $project = $this->fromDbRow($stmt);

        return $project;
    }

    public function delete(Project $project): bool
    {
        $stmt = $this->database->run("DELETE FROM projects WHERE id = :id", ["id" => $project->id]);
        return $stmt->rowCount() > 0;
    }

    private function fromDbRow(mixed $row, bool $withTasks = true): Project
    {
        $project = new Project();
        $project->id = $row->id;
        $project->title = $row->title;
        $project->description = $row->description;
        return $project;
    }
}
