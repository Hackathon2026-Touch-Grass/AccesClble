<?php

namespace App\Controllers;

use App\Models\Task;
use App\Repositories\ProjectRepositoryInterface;
use App\Repositories\TagRepositoryInterface;
use App\Repositories\TaskRepositoryInterface;
use DateTime;
use Framework\Request;
use Framework\Response;
use Framework\ResponseFactory;

use function PHPUnit\Framework\isEmpty;

class TaskController
{
    private ResponseFactory $responseFactory;

    private TaskRepositoryInterface $taskRepository;

    private ProjectRepositoryInterface $projectRepository;

    private TagRepositoryInterface $tagRepository;

    public function __construct(
        ResponseFactory $responseFactory,
        TaskRepositoryInterface $taskRepository,
        ProjectRepositoryInterface $projectRepository,
        TagRepositoryInterface $tagRepository
    ) {
        $this->responseFactory = $responseFactory;
        $this->taskRepository = $taskRepository;
        $this->projectRepository = $projectRepository;
        $this->tagRepository = $tagRepository;
    }

    public function index(): Response
    {
        $tasks = $this->taskRepository->all();
        return $this->responseFactory->view("tasks/index.html.twig", ["tasks" => $tasks]);
    }

    public function create(): Response
    {
        $projects = $this->projectRepository->all();
        $tags = $this->tagRepository->all();
        return $this->responseFactory->view('tasks/create.html.twig', ['projects' => $projects, 'tags' => $tags]);
    }

    public function store(Request $request): Response
    {
        $errors = $this->validate($request);

        $title = $request->get('title');
        $description = $request->get('description') ?? '';
        $priority = $request->get('priority');
        $status = $request->get('status');
        $createdAt = $request->get('created_at');

        $task = new Task();
        $task->title = $title ?? '';
        $task->description = $description;
        $task->priority = (int)$priority;
        $task->status = (int)$status;
        $task->createdAt = (int)$createdAt;

        $tags = $this->tagRepository->all();
        $projects = $this->projectRepository->all();

        if (!empty($errors)) {
            return $this->responseFactory->view("tasks/create.html.twig", [
                "errors" => $errors,
                "task" => $task,
                "projects" => $projects,
                "tags" => $tags
            ]);
        }

        $projectId = $request->get('project');
        if ($projectId !== '') {
            $task->projectId = (int)$projectId;
        }

        $tagsRequest = $request->getMany('tags');
        $tags = [];
        if ($tagsRequest) {
            foreach ($tagsRequest as $tagId) {
                $tag = $this->tagRepository->find((int)$tagId);
                if ($tag) {
                    $tags[] = $tag;
                }
            }
        }
        $task->tags = $tags;

        $task = $this->taskRepository->insert($task);
        if ($task === null) {
            return $this->responseFactory->internalError();
        }
        return $this->responseFactory->redirect('/tasks/' . $task->id);
    }

    public function show(Request $request): Response
    {
        $taskId = (int)$request->get('id');
        $task = $this->taskRepository->find($taskId);

        if ($task === null) {
            return $this->responseFactory->notFound();
        }
        $project = ($task->projectId) ? $this->projectRepository->find($task->projectId) : '';

        return $this->responseFactory->view("tasks/show.html.twig", ["task" => $task, "project" => $project]);
    }

    public function edit(Request $request): Response
    {
        $id = (int)$request->get('id');
        $task = $this->taskRepository->find($id);
        return $this->responseFactory->view('tasks/edit.html.twig', [
            'task' => $task,
            'projects' => $this->projectRepository->all(),
            'tags' => $this->tagRepository->all()
        ]);
    }

    public function update(Request $request): Response
    {
        $errors = $this->validate($request);

        $id = (int)$request->get('id');
        $task = $this->taskRepository->find($id);
        if (!$task) {
            return $this->responseFactory->notFound();
        }

        $task->title = $request->get('title') ?? $task->title;
        $task->description = $request->get('description') ?? $task->description;
        $task->priority = (int)$request->get('priority');
        $task->status = (int)$request->get('status');
        $task->progress = (int)$request->get('progress');
        $task->projectId = (int)$request->get('project');

        $tags = $this->tagRepository->all();
        $projects = $this->projectRepository->all();

        if (!empty($errors)) {
            return $this->responseFactory->view("tasks/edit.html.twig", [
                "errors" => $errors,
                "task" => $task,
                "projects" => $projects,
                "tags" => $tags
            ]);
        }

        if ($request->get('created_at')) {
            $created_at = DateTime::createFromFormat('Y-m-d', $request->get('created_at'));
            $task->createdAt = $created_at ? $created_at->getTimestamp() : (int)date('%s');
        }

        $completedAtInput = $request->get('completed_at');
        if ($completedAtInput) {
            $completedAt = DateTime::createFromFormat('Y-m-d', $completedAtInput);
            $task->completedAt = $completedAt ? $completedAt->getTimestamp() : null;
        }


        $tagsRequest = $request->getMany('tags');
        $tags = [];
        if ($tagsRequest) {
            foreach ($tagsRequest as $tagId) {
                $tag = $this->tagRepository->find((int)$tagId);
                if ($tag) {
                    $tags[] = $tag;
                }
            }
        }
        $task->tags = $tags;

        $taskUpdate = $this->taskRepository->update($task);
        if (!$taskUpdate) {
            return $this->responseFactory->internalError();
        }
        return $this->responseFactory->redirect('/tasks/' . $task->id);
    }

    public function deleteConfirm(Request $request): Response
    {
        $id = (int)$request->get('id');
        $task = $this->taskRepository->find($id);
        if (!$task) {
            return $this->responseFactory->notFound();
        }
        return $this->responseFactory->view('tasks/delete.html.twig', [
            'task' => $task
        ]);
    }

    public function delete(Request $request): Response
    {
        $id = (int)$request->get('id');
        $task = $this->taskRepository->find($id);
        if (!$task) {
            return $this->responseFactory->notFound();
        }
        $this->taskRepository->delete($task);
        return $this->responseFactory->redirect('/tasks');
    }

    /**
     * @return string[]
     */
    public function validate(Request $request): array
    {
        $title = $request->get('title');
        $description = $request->get('description');
        $project = $request->get('project');
        $tags = $request->getMany('tags');
        $priority = $request->get('priority');
        $status = $request->get('status');
        $createdAt = $request->get('created_at');

        $errors = [];

        if ($title == null || trim($title) === '') {
            $errors['title'] = "Title is required.";
        }

        if ($description == null || trim($description) === '') {
            $errors['description'] = "A description is required.";
        }

        if ($project == null || $project === 'No Project') {
            $errors['project'] = "Project is required.";
        }

        if ($tags == null) {
            $errors['tags'] = "At least one tag is required.";
        }

        if (!is_numeric($priority) || in_array((int)$priority, range(0, 3)) === false) {
            $errors['priority'] = "Priority must be specified.";
        }

        if (!is_numeric($status) || in_array((int)$status, range(0, 4)) === false) {
            $errors['status'] = "Status must be specified.";
        }

        if ($createdAt != null) {
            $createdAt = DateTime::createFromFormat('Y-m-d', $createdAt);
            if ($createdAt) {
                $createdAt = $createdAt->getTimestamp();
            } else {
                $createdAt = time();
            }
        }

        return $errors;
    }
}
