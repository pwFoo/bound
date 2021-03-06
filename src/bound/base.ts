import Binding, { IBindingPlugin } from '../binding';
import BoundError from '../boundError';
import config from '../config';

export type IBindingStorage<T extends object> = {
  [key in keyof T]: T[key] extends object ? IBindingStorage<T[key]> : (ProxyHandler<T> | Binding<T[key]>);
};

export type IBoundPluginMap<T extends object> = {
  [key in keyof T]: T[key] extends object ? IBoundPluginMap<T[key]> : IBindingPlugin<T[key]>;
};

/**
  const BoundInstance = new Bound({
    prop: 'bar',
    nested: {
      prop: 'foo'
    }
  });

  BoundInstance.bindAndMap({
    test: 'prop',
    nestedProp: 'value'
  }, {
    prop: 'test',
    nested: {
      prop: 'nestedProp'
    }
  });
 */
export type BindObjectMap<T extends object> = {
  [key in keyof T]: T[key] extends object ? BindObjectMap<T[key]> : string
};

export default abstract class BaseBound<T extends object> {
  /**
   * Stores bindings in a structure that is identical to the binding-prototype-object.
   */
  public storage: IBindingStorage<T> = {} as any;

  /**
   * A bound object created from a constuctor's snapshot object.
   *
   * Contains an instance of the Bound class itself by the `__bound__` key.
   */
  public boundObject = { __bound__: this } as T & { __bound__: BaseBound<T> };

  /**
   * Creates an instance of BaseBound.
   * @param proto used as an object prototype for the creation of boundObject and storage. Doesn't become bound itself.
   * @param [plugins] to plug into the binding events.
   */
  public constructor(proto: T, public plugins?: IBoundPluginMap<T>) {
    // Make __bound__ non-enumerable.
    Object.defineProperty(this.boundObject, '__bound__', {
      value: this,
      writable: true
    });

    if (BaseBound.config.debug && typeof proto !== 'object') {
      throw new BoundError('Only object binds are allowed. For property and pure value bindings use Binding from "bound/binding".');
    }

    if (BaseBound.config.debug && proto instanceof BaseBound || BaseBound.isBound(proto)) {
      throw new BoundError('Cannot rebind a bound object.');
    }
  }

  /**
   * Binds an object to all other current subscribers
   *
   * @template U used to capture the bound object type. Must extends original template type.
   * @param obj to bind
   * @param [twoWay] whether the binding should be two-way
   */
  public abstract bind<U extends T>(obj: U, twoWay?: boolean): this;

  /**
   * [NOT_IMPLEMENTED] Maps the object of a different shape to the original binding object
   * @param obj target object to bind
   * @param mapToOriginal a map for target object's keys relative to the original binding object type
   * @param twoWay whether the binding should be two-way
   */
  public bindAndMap<U>(obj: U, mapToOriginal: BindObjectMap<T>, twoWay?: boolean): this {
    throw new BoundError('Method not implemented.');
  }

  /**
   * Unbinds an object and destroys all of its listeners
   *
   * @param obj reference of object to be unbound
   */
  public abstract unbind<U extends T>(obj: U): U;

  /**
   * Global binding config. Changes affect all instances.
   */
  public static get config() { return config; }


  /**
   * Checks whether an object is already bound.
   *
   * @param obj an object ot check
   */
  public static isBound(obj: any) {
    return !!obj.__bound__ && (obj.__bound__ instanceof BaseBound);
  }
}
