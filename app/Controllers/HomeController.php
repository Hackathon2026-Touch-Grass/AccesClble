<?php

namespace App\Controllers;

use Framework\Response;
use Framework\ResponseFactory;

class HomeController
{
    private ResponseFactory $responseFactory;

    public function __construct(ResponseFactory $responseFactory)
    {
        $this->responseFactory = $responseFactory;
    }

    public function index(): Response
    {
        return $this->responseFactory->view("index.html.twig");
    }

    public function about(): Response
    {
        return $this->responseFactory->view("about.html.twig");
    }
}
