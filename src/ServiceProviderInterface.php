<?php

namespace Framework;

interface ServiceProviderInterface
{
    public function register(ServiceContainer $container): void;
}
