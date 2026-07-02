<?php

namespace App\Repositories;

use App\Models\Task;

interface TaskRepositoryInterface
{
    /** @return Task[] */
    public function all(): array;
    public function find(int $id): ?Task;
    /** @return Task[] */
    public function findProjectTasks(int $projectId): array;
    /** @return Task[] */
    public function findByTag(int $tagId): array;
    public function insert(Task $task): Task|null;
    public function update(Task $task): bool;
    public function delete(Task $task): bool;
}
