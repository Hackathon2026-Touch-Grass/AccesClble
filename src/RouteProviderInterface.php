<?php

namespace Framework;

interface RouteProviderInterface
{
    public function register(Router $router, ServiceContainer $container): void;
}
