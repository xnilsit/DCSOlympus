import { Manager } from "../other/manager";
import { Context, TContextConfig } from "./context";

export class ContextManager extends Manager {
    #currentContext!: string;

    constructor() {
        super();
    }

    add(name: string, contextConfig: TContextConfig) {
        super.add(name, new Context(contextConfig));

        if (Object.values(this.getAll()).length === 1) {
            this.#currentContext = name;
        }

        return this;
    }

    currentContextIs(contextName: string) {
        return contextName === this.#currentContext;
    }

    getCurrentContext() {
        const contexts = this.getAll();

        return (contexts.hasOwnProperty(this.#currentContext)) ? contexts[this.#currentContext] : false;
    }

    setContext(contextName: string) {
        if (!this.get(contextName)) {
            console.error(`setContext(): context name "${contextName}" does not exist.`);
            return false;
        }

        if (contextName !== this.#currentContext) {
            this.getCurrentContext().onUnset();
            this.#currentContext = contextName;
            this.getCurrentContext().onSet();
            console.log(`Setting context to "${this.#currentContext}".`);
        }
    }
}