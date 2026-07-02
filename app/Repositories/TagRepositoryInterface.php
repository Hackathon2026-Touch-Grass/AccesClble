<?php

namespace App\Repositories;

use App\Models\Tag;

interface TagRepositoryInterface
{
    /** @return Tag[] */
    public function all(): array;
    /** @return Tag[] */
    public function findTaskTags(int $taskId): array;
    public function insert(Tag $tag): Tag;
    public function update(Tag $tag): Tag;
    public function find(int $id): ?Tag;
    public function delete(Tag $tag): bool;
}
