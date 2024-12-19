import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render as baseRtlRender } from '@testing-library/react';

const rtlRender = (c, o) => {
  return baseRtlRender(c, {
    ...o,
    legacyRoot: false,
  })
}

import withSideEffect from '../src';

function noop() { }
const identity = x => x

describe('react-side-effect', () => {
  describe('argument validation', () => {
    it('should throw if no reducePropsState function is provided', () => {
      expect(withSideEffect).toThrow('Expected reducePropsToState to be a function.');
    });

    it('should throw if no handleStateChangeOnClient function is provided', () => {
      expect(withSideEffect.bind(null, noop)).toThrow('Expected handleStateChangeOnClient to be a function.');
    });

    it('should throw if mapStateOnServer is defined but not a function', () => {
      expect(withSideEffect.bind(null, noop, noop, 'foo')).toThrow('Expected mapStateOnServer to either be undefined or a function.');
    });

    it('should throw if no WrappedComponent is provided', () => {
      expect(withSideEffect(noop, noop)).toThrow('Expected WrappedComponent to be a React component');
    });
  });

  describe('displayName', () => {
    const withNoopSideEffect = withSideEffect(noop, noop);

    it('should wrap the displayName of wrapped createClass component', () => {
      class Dummy extends React.Component { };
      const SideEffect = withNoopSideEffect(Dummy);

      expect(SideEffect.displayName).toBe('SideEffect(Dummy)');
    });

    it('should wrap the displayName of wrapped ES2015 class component', () => {
      class Dummy extends React.Component {
        static displayName = 'Dummy'
        render() {}
      }
      const SideEffect = withNoopSideEffect(Dummy);

      expect(SideEffect.displayName).toBe('SideEffect(Dummy)');
    });

    it('should use the constructor name of the wrapped functional component', () => {
      function DummyComponent() {}

      const SideEffect = withNoopSideEffect(DummyComponent);

      expect(SideEffect.displayName).toBe('SideEffect(DummyComponent)');
    });

    it('should fallback to "Component"', () => {
      const SideEffect = withNoopSideEffect(class extends React.Component { });

      expect(SideEffect.displayName).toBe('SideEffect(Component)');
    });
  });

  describe('SideEffect component', () => {
    class DummyComponent extends React.Component {
      render () {
        return <div>hello {this.props.foo}</div>
      }
    };

    const withIdentitySideEffect = withSideEffect(identity, noop);
    let SideEffect;

    beforeEach(() => {
      SideEffect = withIdentitySideEffect(DummyComponent);
    });

    it('should expose the canUseDOM flag', () => {
      expect(SideEffect).toHaveProperty('canUseDOM');
    });

    describe('rewind', () => {
      it('should throw if used in the browser', () => {
        SideEffect.canUseDOM = true;
        expect(SideEffect.rewind).toThrow('You may only call rewind() on the server. Call peek() to read the current state.');
      });

      it('should return the current state', () => {
        SideEffect.canUseDOM = false;
        rtlRender(<SideEffect foo="bar"/>);
        const state = SideEffect.rewind();
        expect(state).toEqual([{ foo: 'bar' }]);
      });

      it('should reset the state', () => {
        SideEffect.canUseDOM = false;
        rtlRender(<SideEffect foo="bar"/>);
        SideEffect.rewind();
        const state = SideEffect.rewind();
        expect(state).toBe(undefined);
      });
    });

    describe('peek', () => {
      it('should return the current state', () => {
        rtlRender(<SideEffect foo="bar"/>);
        expect(SideEffect.peek()).toEqual([{foo: 'bar'}]);
      });

      it('should NOT reset the state', () => {
        rtlRender(<SideEffect foo="bar"/>);

        SideEffect.peek();
        const state = SideEffect.peek();

        expect(state).toEqual([{foo: 'bar'}]);
      });
    });

    describe('handleStateChangeOnClient', () => {
      it('should execute handleStateChangeOnClient', () => {
        let sideEffectCollectedData;

        const handleStateChangeOnClient = state => (sideEffectCollectedData = state)

        SideEffect = withSideEffect(identity, handleStateChangeOnClient)(DummyComponent);

        SideEffect.canUseDOM = true;

        rtlRender(<SideEffect foo="bar"/>);

        expect(sideEffectCollectedData).toEqual([{foo: 'bar'}]);
      });
    });

    describe('mapStateOnServer', () => {
      it('should apply a custom mapStateOnServer function', () => {
        const mapStateOnServer = ([ prop ]) => prop

        SideEffect = withSideEffect(identity, noop, mapStateOnServer)(DummyComponent);

        SideEffect.canUseDOM = false;

        rtlRender(<SideEffect foo="bar"/>);

        let state = SideEffect.rewind();

        expect(state).not.toBeInstanceOf(Array);
        expect(state).toEqual({foo: 'bar'});

        SideEffect.canUseDOM = true;

        rtlRender(<SideEffect foo="bar"/>);

        state = SideEffect.peek();

        expect(state).toBeInstanceOf(Array);
        expect(state).toEqual([{foo: 'bar'}]);
      });
    });

    it('should collect props from all instances', () => {
      rtlRender(<SideEffect foo="bar"/>);
      rtlRender(<SideEffect something="different"/>);

      const state = SideEffect.peek();

      expect(state).toEqual([{foo: 'bar'}, {something: 'different'}]);
    });

    it('should render the wrapped component', () => {
      const markup = renderToStaticMarkup(<SideEffect foo="bar"/>);

      expect(markup).toBe('<div>hello bar</div>');
    });

    describe('with DOM', () => {
      it('should only recompute when component updates', () => {
        let collectCount = 0;

        function handleStateChangeOnClient(state) {
          collectCount += 1;
        }

        SideEffect = withSideEffect(identity, handleStateChangeOnClient)(DummyComponent);

        SideEffect.canUseDOM = true;

        const { rerender } = rtlRender(<SideEffect text="bar" />);
        expect(collectCount).toBe(1);
        rerender(<SideEffect text="bar" />);
        expect(collectCount).toBe(1);
        rerender(<SideEffect text="baz" />);
        expect(collectCount).toBe(2);
        rerender(<SideEffect text="baz" />);
        expect(collectCount).toBe(2);
      });
    });
  });
});
