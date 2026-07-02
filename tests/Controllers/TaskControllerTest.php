<?php

namespace Controllers;

use App\Controllers\TaskController;
use App\Models\Project;
use App\Models\Tag;
use App\Models\Task;
use App\Repositories\ProjectRepository;
use App\Repositories\ProjectRepositoryInterface;
use App\Repositories\TagRepository;
use App\Repositories\TagRepositoryInterface;
use App\Repositories\TaskRepository;
use App\Repositories\TaskRepositoryInterface;
use Framework\Database;
use Framework\Request;
use Framework\Response;
use Framework\ResponseFactory;
use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

#[AllowMockObjectsWithoutExpectations]
class TaskControllerTest extends TestCase
{
    private TaskRepositoryInterface&MockObject $taskRepository;
    private ProjectRepositoryInterface&MockObject $projectRepository;
    private TagRepositoryInterface&MockObject $tagRepository;
    private ResponseFactory&MockObject $responseFactory;

    private TaskController $controller;

    protected function setUp(): void
    {
        parent::setUp();

        // This is NOT best practice, we will improve on this in the next lecture.
        //        $database = new Database(':memory:');
        //        $responseFactory = new ResponseFactory(false, 'app/views');
        //        $tagRepository = new TagRepository($database);
        //        $taskRepository = new TaskRepository($database, $tagRepository);
        //        $projectRepository = new ProjectRepository($database);

        $this->taskRepository = $this->createMock(TaskRepositoryInterface::class);
        $this->projectRepository = $this->createMock(ProjectRepositoryInterface::class);
        $this->tagRepository = $this->createMock(TagRepositoryInterface::class);
        $this->responseFactory = $this->createMock(ResponseFactory::class);

        // Set up the controller to be tested
        $this->controller = new TaskController(
            $this->responseFactory,
            $this->taskRepository,
            $this->projectRepository,
            $this->tagRepository
        );
    }

    public function testValidationReturnsNoErrorsOnCorrectInput(): void
    {
        // Arrange
        $queryParameters = [];
        $postParameters = [
            "title" => "Test Task",
            "description" => "Test Description",
            "project" => "1",
            "tags" => ["1"],
            "priority" => "0",
            "status" => "0",
            "created_at" => "2026-04-22",
            "completed_at" => "2026-04-23"
        ];

        $request = new Request('POST', '/tasks', $queryParameters, $postParameters);

        $expectedResult = [];

        // Act
        $result = $this->controller->validate($request);

        // Assert
        $this->assertSame($expectedResult, $result);
    }

    public function testValidationReturnsErrorsOnInvalidInputForName(): void
    {
        // Arrange
        $queryParameters = [];
        $postParameters = [
            "title" => "",
            "description" => "Test Description",
            "project" => "1",
            "tags" => ["1"],
            "priority" => "0",
            "status" => "0",
            "created_at" => "2026-04-22",
            "completed_at" => "2026-04-23"
        ];

        $request = new Request('POST', '/tasks', $queryParameters, $postParameters);

        $expectedResult = ['title' => 'Title is required.'];

        // Act
        $result = $this->controller->validate($request);

        // Assert
        $this->assertSame($expectedResult, $result);
    }

    public function testValidationReturnsErrorsOnInvalidInputForDescription(): void
    {
        // Arrange
        $queryParameters = [];
        $postParameters = [
            "title" => "Test Task",
            "description" => "",
            "project" => "1",
            "tags" => ["1"],
            "priority" => "0",
            "status" => "0",
            "created_at" => "2026-04-22",
            "completed_at" => "2026-04-23"
        ];

        $request = new Request('POST', '/tasks', $queryParameters, $postParameters);

        $expectedResult = ['description' => 'A description is required.'];

        // Act
        $result = $this->controller->validate($request);

        // Assert
        $this->assertSame($expectedResult, $result);
    }

    public function testValidationReturnsErrorsOnInvalidInputForProject(): void
    {
        // Arrange
        $queryParameters = [];
        $postParameters = [
            "title" => "Test Task",
            "description" => "Test Description",
            // No Project selected, therefore not present in this array
            "tags" => ["1"],
            "priority" => "0",
            "status" => "0",
            "created_at" => "2026-04-22",
            "completed_at" => "2026-04-23"
        ];

        $request = new Request('POST', '/tasks', $queryParameters, $postParameters);

        $expectedResult = ['project' => 'Project is required.'];

        // Act
        $result = $this->controller->validate($request);

        // Assert
        $this->assertSame($expectedResult, $result);
    }

    public function testIndexReturnsViewWithAllTasks(): void
    {
        // Arrange
        $tasks = [
            new Task(),
            new Task(),
        ];

        $tasks[0]->title = 'Task 1';
        $tasks[0]->description = 'Task 1 description';
        $tasks[0]->projectId = 1;
        $tasks[1]->title = 'Task 2';
        $tasks[1]->description = 'Task 2 description';
        $tasks[1]->projectId = 2;

        $expectedResponse = $this->createMock(Response::class);

        $this->taskRepository
            ->expects($this->once())
            ->method('all')
            ->willReturn($tasks);

        $this->responseFactory
            ->expects($this->once())
            ->method('view')
            ->with('tasks/index.html.twig', ['tasks' => $tasks])
            ->willReturn($expectedResponse);

        // Act
        $response = $this->controller->index();

        // Assert
        $this->assertSame($expectedResponse, $response);
    }

    public function testStoreCreatesTaskAndRedirects(): void
    {
        // Arrange
        $tag = new Tag();
        $tag->id = 1;
        $tag->title = 'Test Tag';

        $createdTask = new Task();
        $createdTask->id = 1;
        $createdTask->title = 'New Task';
        $createdTask->description = 'New Description';
        $createdTask->projectId = 1;

        $request = new Request('POST', '/tasks', [], [
            'title' => 'New Task',
            'description' => 'New Description',
            'project' => '1',
            'tags' => ['1'],
            'priority' => '0',
            'status' => '0',
            'created_at' => '2026-04-22',
        ]);

        $expectedResponse = $this->createMock(Response::class);

        $this->tagRepository
            ->method('find')
            ->willReturn($tag);

        $this->taskRepository
            ->expects($this->once())
            ->method('insert')
            // store() uses a request to create a task which it gives to insert(), so we check if that matches
            ->with($this->callback(function ($task) use ($tag) {
                return $task->title == 'New Task'
                    && $task->description == 'New Description'
                    && $task->priority == 0
                    && $task->status == 0
                    && $task->projectId == 1
                    && $task->createdAt > 0
                    && $task->tags === [$tag];
            }))
            ->willReturn($createdTask);

        $this->responseFactory
            ->expects($this->once())
            ->method('redirect')
            ->with('/tasks/1')
            ->willReturn($expectedResponse);

        // Act
        $response = $this->controller->store($request);

        // Assert
        $this->assertSame($expectedResponse, $response);
    }
}
