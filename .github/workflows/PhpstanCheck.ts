import { BaseClass } from "./BaseClass";

export default class PhpstanCheck extends BaseClass {
    public check (): boolean {
        return this.runCommand(
            "PHPStan",
            "php vendor/bin/phpstan analyse src tests --level=5"
        );
    }
}