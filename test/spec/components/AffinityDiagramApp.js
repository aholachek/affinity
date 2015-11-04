'use strict';

describe('AffinityDiagramApp', () => {
  let React = require('react/addons');
  let AffinityDiagramApp, component;

  beforeEach(() => {
    let container = document.createElement('div');
    container.id = 'content';
    document.body.appendChild(container);

    AffinityDiagramApp = require('components/AffinityDiagramApp.js');
    component = React.createElement(AffinityDiagramApp);
  });

  it('should create a new instance of AffinityDiagramApp', () => {
    expect(component).toBeDefined();
  });
});
