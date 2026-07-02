<?php

namespace App\Controllers;

use App\Models\Project;
use App\Repositories\ProjectRepositoryInterface;
use App\Repositories\TaskRepositoryInterface;
use Framework\Response;
use Framework\ResponseFactory;
use Framework\Request;

class ProjectController
{
    private ResponseFactory $responseFactory;

    private ProjectRepositoryInterface $projectRepository;

    private TaskRepositoryInterface $taskRepository;

    public function __construct(
        ResponseFactory $responseFactory,
        ProjectRepositoryInterface $projectRepository,
        TaskRepositoryInterface $taskRepository
    ) {
        $this->responseFactory = $responseFactory;
        $this->projectRepository = $projectRepository;
        $this->taskRepository = $taskRepository;
    }

    public function index(): Response
    {
        $projects = $this->projectRepository->all();
        return $this->responseFactory->view('projects/index.html.twig', [
            'projects' => $projects
        ]);
    }

    public function show(Request $request): Response
    {
        $id = (int)$request->get('id');
        $project = $this->projectRepository->find($id);
        if (!$project) {
            return $this->responseFactory->notFound();
        }
        $tasks = $this->taskRepository->findProjectTasks($id);
        return $this->responseFactory->view('projects/show.html.twig', [
            'project' => $project,
            'tasks' => $tasks
        ]);
    }

    public function edit(Request $request): Response
    {
        $id = (int)$request->get('id');
        $project = $this->projectRepository->find($id);
        return $this->responseFactory->view('projects/edit.html.twig', [
            'project' => $project
        ]);
    }

    public function delete(Request $request): Response
    {
        $id = (int)$request->get('id');
        $project = $this->projectRepository->find($id);
        if (!$project) {
            return $this->responseFactory->notFound();
        }
        $this->projectRepository->delete($project);
        return $this->responseFactory->redirect('/projects');
    }

    public function update(Request $request): Response
    {
        $id = (int)$request->get('id');
        $project = $this->projectRepository->find($id);
        if (!$project) {
            return $this->responseFactory->notFound();
        }
        $project->title = $request->get('title') ?? $project->title;
        $project->description = $request->get('description') ?? $project->description;
        $this->projectRepository->update($project);
        return $this->responseFactory->redirect('/projects/' . $project->id);
    }

    public function create(Request $request): Response
    {
        return $this->responseFactory->view('projects/create.html.twig');
    }

    public function store(Request $request): Response
    {
        $errors = $this->validate($request);
        if (!empty($errors)) {
            return $this->responseFactory->view('projects/create.html.twig', [
                'errors' => $errors
            ]);
        }

        $project = new Project();
        $project->title = $request->get('title') ?? '';
        $project->description = $request->get('description') ?? '';

        $project = $this->projectRepository->insert($project);
        return $this->responseFactory->redirect('/projects/' . $project->id);
    }

    /**
     * @param Request $request
     * @return string[]
     */
    private function validate(Request $request): array
    {
        $errors = [];
        if (!$request->get('title')) {
            $errors['title'] = 'Title is required';
        }

        return $errors;
    }
}
