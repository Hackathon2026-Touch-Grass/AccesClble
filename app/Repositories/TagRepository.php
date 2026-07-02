<?php

namespace App\Repositories;

use Framework\Database;
use App\Models\Tag;

class TagRepository implements TagRepositoryInterface
{
    private Database $database;

    public function __construct(Database $database)
    {
        $this->database = $database;
    }

    /**
     * @return Tag[]
     */
    public function all(): array
    {
        $stmt = $this->database->run("SELECT * FROM tags")->fetchAll();
        $tags = [];
        foreach ($stmt as $row) {
            $tag = $this->fromDbRow($row);
            $tags[] = $tag;
        }
        return $tags;
    }

    /**
     * @return Tag[]
     */
    public function findTaskTags(int $taskId): array
    {
        $stmt = $this->database->run(
            "SELECT * FROM tags LEFT JOIN task_tags ON tags.id = task_tags.tag_id WHERE task_id = :taskId",
            ["taskId" => $taskId]
        )->fetchAll();
        $tags = [];
        foreach ($stmt as $row) {
            $tag = $this->fromDbRow($row);
            $tags[] = $tag;
        }
        return $tags;
    }

    public function insert(Tag $tag): Tag
    {
        $stmt = $this->database->run("INSERT INTO tags (title) VALUES (:title)", [
            "title" => $tag->title
        ]);
        $tag->id = $this->database->getLastID();
        return $tag;
    }

    public function update(Tag $tag): Tag
    {
        $stmt = $this->database->run("UPDATE tags SET title = :title WHERE id = :id", [
            "title" => $tag->title,
            "id" => $tag->id
        ]);
        return $tag;
    }

    public function find(int $id): ?Tag
    {
        $stmt = $this->database->run("SELECT * FROM tags WHERE id = :id", ["id" => $id])->fetch();
        if (!$stmt) {
            return null;
        }
        $tag = $this->fromDbRow($stmt);
        return $tag;
    }

    public function delete(Tag $tag): bool
    {
        $stmt = $this->database->run("DELETE FROM tags WHERE id = :id", ["id" => $tag->id]);
        return $stmt->rowCount() > 0;
    }

    private function fromDbRow(mixed $row): Tag
    {
        $tag = new Tag();
        $tag->id = $row->id;
        $tag->title = $row->title;
        return $tag;
    }
}
