<?php

namespace Framework;

class Router
{
    private ResponseFactory $responseFactory;

    /** @var Route[] */
    private array $routes = [];

    public function __construct(ResponseFactory $responseFactory)
    {
        $this->responseFactory = $responseFactory;
    }

    /**
     * Dispatch the Request to the appropriate route and return a Response.
     *
     * @param Request $request
     * @return Response
     */
    public function dispatch(Request $request): Response
    {
        foreach ($this->routes as $route) {
            if ($route->matches($request->method, $request->path)) {
                $callback = $route->callback;
                $request->routeParameters = $route->routeParameters;
                $response = $callback($request);
                return $response;
            }
        }

        // No matching route found, return a 404 response
        return $this->responseFactory->notFound();
    }

    /**
     * Add a new route to the router.
     *
     * @param string $method HTTP method
     * @param string $path URL path
     * @param callable $callback Callback function to handle the route
     * @return void
     */
    public function addRoute(string $method, string $path, callable $callback): void
    {
        $route = new Route($method, $path, $callback);
        $this->routes[] = $route;
    }
}
