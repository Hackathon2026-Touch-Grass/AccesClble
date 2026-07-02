<?php

namespace App\Models;

class Task
{
    public int $id;

    public string $title;

    public string $description;

    public int $priority;

    public int $status;

    public int $progress;

    public int $createdAt;

    public ?int $completedAt;

    public ?int $projectId = null;

    /** @var Tag[] */
    public array $tags;

    public function __construct()
    {
        $this->priority = 0;
        $this->status = 0;
        $this->progress = 0;
        $this->createdAt = time();
        $this->completedAt = null;
    }
}
