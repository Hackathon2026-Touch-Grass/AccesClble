<?php

namespace App\Controllers;

use App\Models\Tag;
use App\Repositories\TagRepositoryInterface;
use App\Repositories\TaskRepositoryInterface;
use Framework\Response;
use Framework\ResponseFactory;
use Framework\Request;

class TagController
{
    private ResponseFactory $responseFactory;

    private TagRepositoryInterface $tagRepository;

    private TaskRepositoryInterface $taskRepository;

    public function __construct(
        ResponseFactory $responseFactory,
        TagRepositoryInterface $tagRepository,
        TaskRepositoryInterface $taskRepository
    ) {
        $this->responseFactory = $responseFactory;
        $this->tagRepository = $tagRepository;
        $this->taskRepository = $taskRepository;
    }

    public function index(): Response
    {
        $tags = $this->tagRepository->all();
        return $this->responseFactory->view('tags/index.html.twig', [
            'tags' => $tags
        ]);
    }

    public function show(Request $request): Response
    {
        $id = (int)$request->get('id');
        $tag = $this->tagRepository->find($id);
        if (!$tag) {
            return $this->responseFactory->notFound();
        }
        $tasks = $this->taskRepository->findByTag($id);
        return $this->responseFactory->view('tags/show.html.twig', [
            'tag' => $tag,
            'tasks' => $tasks
        ]);
    }

    public function edit(Request $request): Response
    {
        $id = (int)$request->get('id');
        $tag = $this->tagRepository->find($id);
        return $this->responseFactory->view('tags/edit.html.twig', [
            'tag' => $tag
        ]);
    }

    public function delete(Request $request): Response
    {
        $id = (int)$request->get('id');
        $tag = $this->tagRepository->find($id);
        if (!$tag) {
            return $this->responseFactory->notFound();
        }
        $this->tagRepository->delete($tag);
        return $this->responseFactory->redirect('/tags');
    }

    public function update(Request $request): Response
    {
        $id = (int)$request->get('id');
        $tag = $this->tagRepository->find($id);
        if (!$tag) {
            return $this->responseFactory->notFound();
        }
        $tag->title = $request->get('title') ?? $tag->title;
        $this->tagRepository->update($tag);
        return $this->responseFactory->redirect('/tags/' . $tag->id);
    }

    public function create(Request $request): Response
    {
        return $this->responseFactory->view('tags/create.html.twig');
    }

    public function store(Request $request): Response
    {
        $errors = $this->validate($request);
        if (!empty($errors)) {
            return $this->responseFactory->view('tags/create.html.twig', [
                'errors' => $errors
            ]);
        }

        $tag = new Tag();
        $tag->title = $request->get('title') ?? '';

        $tag = $this->tagRepository->insert($tag);
        return $this->responseFactory->redirect('/tags/' . $tag->id);
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
