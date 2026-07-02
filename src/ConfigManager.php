<?php

namespace Framework;

use Exception;

class ConfigManager
{
    /** @var string[] */
    private array $defaults = array(
        'APP_ENV' => 'production'
    );

    /** @var string[] */
    public array $config = array();

    /**
     * @param string[] $config
     */
    public function __construct(array $config = array())
    {
        $this->config = array_merge($this->defaults, $config);
    }

    /**
     * @throws Exception
     */
    public function get(string $key): string
    {
        if (!isset($this->config[$key])) {
            throw new Exception('Config item: ' . $key . ' not set');
        }
        return $this->config[$key];
    }

    /**
     * @throws Exception
     */
    public function isProduction(): bool
    {
        return (strtoupper($this->get('APP_ENV')) === 'PRODUCTION');
    }
}
