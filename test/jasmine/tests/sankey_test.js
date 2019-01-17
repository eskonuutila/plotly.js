var Plotly = require('@lib/index');
var attributes = require('@src/traces/sankey/attributes');
var Lib = require('@src/lib');
var d3 = require('d3');
var mock = require('@mocks/sankey_energy.json');
var mockDark = require('@mocks/sankey_energy_dark.json');
var Sankey = require('@src/traces/sankey');

var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var failTest = require('../assets/fail_test');
var mouseEvent = require('../assets/mouse_event');
var assertHoverLabelStyle = require('../assets/custom_assertions').assertHoverLabelStyle;
var supplyAllDefaults = require('../assets/supply_defaults');
var defaultColors = require('@src/components/color/attributes').defaults;

describe('sankey tests', function() {

    'use strict';

    function _supply(traceIn) {
        var traceOut = { visible: true };
        var defaultColor = '#444';
        var layout = { colorway: defaultColors };

        Sankey.supplyDefaults(traceIn, traceOut, defaultColor, layout);

        return traceOut;
    }

    function _supplyWithLayout(traceIn, layout) {
        var traceOut = { visible: true };
        var defaultColor = '#444';

        Sankey.supplyDefaults(traceIn, traceOut, defaultColor, Lib.extendFlat({colorway: defaultColors}, layout));

        return traceOut;
    }

    describe('don\'t remove nodes if encountering no circularity', function() {

        it('removing a single self-pointing node', function() {
            var fullTrace = _supply({
                node: {
                    label: ['a', 'b']
                },
                link: {
                    value: [1],
                    source: [1],
                    target: [0]
                }
            });

            expect(fullTrace.node.label).toEqual(['a', 'b'], 'node labels retained');
            expect(fullTrace.link.value).toEqual([1], 'link value(s) retained');
            expect(fullTrace.link.source).toEqual([1], 'link source(s) retained');
            expect(fullTrace.link.target).toEqual([0], 'link target(s) retained');
        });
    });

    describe('No warnings for missing nodes', function() {
        // we used to warn when some nodes were not used in the links
        // not doing that anymore, it's not really consistent with
        // the rest of our data processing.
        it('some nodes are not linked', function() {

            var warnings = [];
            spyOn(Lib, 'warn').and.callFake(function(msg) {
                warnings.push(msg);
            });

            _supply({
                node: {
                    label: ['a', 'b', 'c']
                },
                link: {
                    value: [1],
                    source: [0],
                    target: [1]
                }
            });

            expect(warnings.length).toEqual(0);
        });
    });

    describe('sankey global defaults', function() {

        it('should not coerce trace opacity', function() {
            var gd = Lib.extendDeep({}, mock);

            supplyAllDefaults(gd);

            expect(gd._fullData[0].opacity).toBeUndefined();
        });

    });

    describe('sankey defaults', function() {

        it('\'Sankey\' specification should have proper arrays where mandatory',
            function() {

                var fullTrace = _supply({});

                expect(fullTrace.node.label)
                    .toEqual([], 'presence of node label array is guaranteed');

                expect(fullTrace.link.value)
                    .toEqual([], 'presence of link value array is guaranteed');

                expect(fullTrace.link.source)
                    .toEqual([], 'presence of link source array is guaranteed');

                expect(fullTrace.link.target)
                    .toEqual([], 'presence of link target array is guaranteed');

                expect(fullTrace.link.label)
                    .toEqual([], 'presence of link target array is guaranteed');
            });

        it('\'Sankey\' specification should have proper types',
            function() {

                var fullTrace = _supply({});

                expect(fullTrace.orientation)
                    .toEqual(attributes.orientation.dflt, 'use orientation by default');

                expect(fullTrace.valueformat)
                    .toEqual(attributes.valueformat.dflt, 'valueformat by default');

                expect(fullTrace.valuesuffix)
                    .toEqual(attributes.valuesuffix.dflt, 'valuesuffix by default');

                expect(fullTrace.arrangement)
                    .toEqual(attributes.arrangement.dflt, 'arrangement by default');

                expect(fullTrace.domain.x)
                    .toEqual(attributes.domain.x.dflt, 'x domain by default');

                expect(fullTrace.domain.y)
                    .toEqual(attributes.domain.y.dflt, 'y domain by default');
            });

        it('\'Sankey\' layout dependent specification should have proper types',
            function() {

                var fullTrace = _supplyWithLayout({}, {font: {family: 'Arial'}});
                expect(fullTrace.textfont)
                    .toEqual({family: 'Arial'}, 'textfont is defined');
            });

        it('\'line\' specifications should yield the default values',
            function() {

                var fullTrace = _supply({});

                expect(fullTrace.node.line.color)
                    .toEqual('#444', 'default node line color');
                expect(fullTrace.node.line.width)
                    .toEqual(0.5, 'default node line thickness');

                expect(fullTrace.link.line.color)
                    .toEqual('#444', 'default link line color');
                expect(fullTrace.link.line.width)
                    .toEqual(0, 'default link line thickness');
            });

        it('fills \'node\' colors if not specified', function() {

            var fullTrace = _supply({
                node: {
                    label: ['a', 'b']
                },
                link: {
                    source: [0],
                    target: [1],
                    value: [1]
                }
            });

            expect(Array.isArray(fullTrace.node.color)).toBe(true, 'set up color array');
            expect(fullTrace.node.color).toEqual(['rgba(31, 119, 180, 0.8)', 'rgba(255, 127, 14, 0.8)']);

        });

        it('respects layout.colorway', function() {

            var fullTrace = _supplyWithLayout({
                node: {
                    label: ['a', 'b']
                },
                link: {
                    source: [0],
                    target: [1],
                    value: [1]
                }
            }, {colorway: ['rgb(255, 0, 0)', 'rgb(0, 0, 255)']});

            expect(Array.isArray(fullTrace.node.color)).toBe(true, 'set up color array');
            expect(fullTrace.node.color).toEqual(['rgba(255, 0, 0, 0.8)', 'rgba(0, 0, 255, 0.8)']);

        });

        it('does not fill \'link\' labels even if not specified', function() {

            var fullTrace = _supply({
                node: {
                    label: ['a', 'b']
                },
                link: {
                    source: [0, 1],
                    target: [1, 0],
                    value: [1, 2]
                }
            });

            expect(Array.isArray(fullTrace.link.label)).toBe(true, 'must be an array');
            expect(fullTrace.link.label).toEqual([], 'an array of empty strings');
        });

        it('preserves \'link\' labels if  specified', function() {

            var fullTrace = _supply({
                node: {
                    label: ['a', 'b']
                },
                link: {
                    source: [0, 1],
                    target: [1, 0],
                    value: [1, 2],
                    label: ['a', 'b']
                }
            });

            expect(Array.isArray(fullTrace.link.label)).toBe(true, 'must be an array');
            expect(fullTrace.link.label).toEqual(['a', 'b'], 'an array of the supplied values');
        });
    });

    describe('sankey calc', function() {

        function _calc(trace) {
            var gd = { data: [trace] };

            supplyAllDefaults(gd);
            var fullTrace = gd._fullData[0];
            Sankey.calc(gd, fullTrace);
            return fullTrace;
        }

        var base = { type: 'sankey' };

        describe('remove nodes if encountering circularity', function() {
            var errors;

            beforeEach(function() {
                errors = [];
                spyOn(Lib, 'error').and.callFake(function(msg) {
                    errors.push(msg);
                });
            });

            it('removing a single self-pointing node', function() {
                expect(errors.length).toBe(0);

                var fullTrace = _calc(Lib.extendDeep({}, base, {
                    node: {
                        label: ['a']
                    },
                    link: {
                        value: [1],
                        source: [0],
                        target: [0]
                    }
                }));

                expect(fullTrace.node.label).toEqual([], 'node label(s) removed');
                expect(fullTrace.link.value).toEqual([], 'link value(s) removed');
                expect(fullTrace.link.source).toEqual([], 'link source(s) removed');
                expect(fullTrace.link.target).toEqual([], 'link target(s) removed');
                expect(errors.length).toBe(1);
            });

            it('removing everything if detecting a circle', function() {
                expect(errors.length).toBe(0);

                var fullTrace = _calc(Lib.extendDeep({}, base, {
                    node: {
                        label: ['a', 'b', 'c', 'd', 'e']
                    },
                    link: {
                        value: [1, 1, 1, 1, 1, 1, 1, 1],
                        source: [0, 1, 2, 3],
                        target: [1, 2, 0, 4]
                    }
                }));

                expect(fullTrace.node.label).toEqual([], 'node label(s) removed');
                expect(fullTrace.link.value).toEqual([], 'link value(s) removed');
                expect(fullTrace.link.source).toEqual([], 'link source(s) removed');
                expect(fullTrace.link.target).toEqual([], 'link target(s) removed');
                expect(errors.length).toBe(1);
            });
        });
    });

    describe('lifecycle methods', function() {
        afterEach(destroyGraphDiv);

        it('Plotly.deleteTraces with two traces removes the deleted plot', function(done) {

            var gd = createGraphDiv();
            var mockCopy = Lib.extendDeep({}, mock);
            var mockCopy2 = Lib.extendDeep({}, mockDark);

            Plotly.plot(gd, mockCopy)
                .then(function() {
                    expect(gd.data.length).toEqual(1);
                    expect(d3.selectAll('.sankey').size()).toEqual(1);
                    return Plotly.addTraces(gd, mockCopy2.data[0]);
                })
                .then(function() {
                    expect(gd.data.length).toEqual(2);
                    expect(d3.selectAll('.sankey').size()).toEqual(2);
                    return Plotly.deleteTraces(gd, [0]);
                })
                .then(function() {
                    expect(gd.data.length).toEqual(1);
                    expect(d3.selectAll('.sankey').size()).toEqual(1);
                    return Plotly.deleteTraces(gd, 0);
                })
                .then(function() {
                    expect(gd.data.length).toEqual(0);
                    expect(d3.selectAll('.sankey').size()).toEqual(0);
                    done();
                });
        });

        it('Plotly.plot does not show Sankey if \'visible\' is false', function(done) {

            var gd = createGraphDiv();
            var mockCopy = Lib.extendDeep({}, mock);

            Plotly.plot(gd, mockCopy)
                .then(function() {
                    expect(gd.data.length).toEqual(1);
                    expect(d3.selectAll('.sankey').size()).toEqual(1);
                    return Plotly.restyle(gd, 'visible', false);
                })
                .then(function() {
                    expect(gd.data.length).toEqual(1);
                    expect(d3.selectAll('.sankey').size()).toEqual(0);
                    return Plotly.restyle(gd, 'visible', true);
                })
                .then(function() {
                    expect(gd.data.length).toEqual(1);
                    expect(d3.selectAll('.sankey').size()).toEqual(1);
                    done();
                });
        });

        it('\'node\' remains visible even if \'value\' is very low', function(done) {

            var gd = createGraphDiv();
            var minimock = [{
                type: 'sankey',
                node: {
                    label: ['a', 'b1', 'b2']
                },
                link: {
                    source: [0, 0],
                    target: [1, 2],
                    value: [1000000, 0.001]
                }
            }];
            Plotly.plot(gd, minimock)
                .then(function() {
                    expect(d3.selectAll('.sankey .node-rect')[0].reduce(function(prevMin, rect) {
                        return Math.min(prevMin, d3.select(rect).attr('height'));
                    }, Infinity)).toEqual(0.5);
                    done();
                });
        });
    });

    describe('Test hover/click interactions:', function() {
        afterEach(destroyGraphDiv);

        function _hover(px, py) {
            mouseEvent('mousemove', px, py);
            mouseEvent('mouseover', px, py);
            Lib.clearThrottle();
        }

        var node = [404, 302];
        var link = [450, 300];

        it('should show the correct hover labels', function(done) {
            var gd = createGraphDiv();
            var mockCopy = Lib.extendDeep({}, mock);

            Plotly.plot(gd, mockCopy).then(function() {
                _hover(404, 302);

                assertLabel(
                    ['Solid', 'incoming flow count: 4', 'outgoing flow count: 3', '447TWh'],
                    ['rgb(148, 103, 189)', 'rgb(255, 255, 255)', 13, 'Arial', 'rgb(255, 255, 255)']
                );
            })
            .then(function() {
                _hover(450, 300);

                assertLabel(
                    ['source: Solid', 'target: Industry', '46TWh'],
                    ['rgb(0, 0, 96)', 'rgb(255, 255, 255)', 13, 'Arial', 'rgb(255, 255, 255)']
                );
            })
            // Test layout.hoverlabel
            .then(function() {
                return Plotly.relayout(gd, 'hoverlabel.font.family', 'Roboto');
            })
            .then(function() {
                _hover(404, 302);

                assertLabel(
                    ['Solid', 'incoming flow count: 4', 'outgoing flow count: 3', '447TWh'],
                    ['rgb(148, 103, 189)', 'rgb(255, 255, 255)', 13, 'Roboto', 'rgb(255, 255, 255)']
                );
            })
            .then(function() {
                _hover(450, 300);

                assertLabel(
                    ['source: Solid', 'target: Industry', '46TWh'],
                    ['rgb(0, 0, 96)', 'rgb(255, 255, 255)', 13, 'Roboto', 'rgb(255, 255, 255)']
                );
            })
            // Test trace-level hoverlabel
            .then(function() {
                return Plotly.restyle(gd, {
                    'hoverlabel.bgcolor': 'blue',
                    'hoverlabel.bordercolor': 'red',
                    'hoverlabel.font.size': 22,
                    'hoverlabel.font.color': 'magenta'
                });
            })
            .then(function() {
                _hover(404, 302);

                assertLabel(
                    ['Solid', 'incoming flow count: 4', 'outgoing flow count: 3', '447TWh'],
                    ['rgb(0, 0, 255)', 'rgb(255, 0, 0)', 22, 'Roboto', 'rgb(255, 0, 255)']
                );
            })
            .then(function() {
                _hover(450, 300);

                assertLabel(
                    ['source: Solid', 'target: Industry', '46TWh'],
                    ['rgb(0, 0, 255)', 'rgb(255, 0, 0)', 22, 'Roboto', 'rgb(255, 0, 255)']
                );
            })
            // Test (node|link).hoverlabel
            .then(function() {
                return Plotly.restyle(gd, {
                    'node.hoverlabel.bgcolor': 'red',
                    'node.hoverlabel.bordercolor': 'blue',
                    'node.hoverlabel.font.size': 20,
                    'node.hoverlabel.font.color': 'black',
                    'node.hoverlabel.font.family': 'Roboto',
                    'link.hoverlabel.bgcolor': 'yellow',
                    'link.hoverlabel.bordercolor': 'magenta',
                    'link.hoverlabel.font.size': 18,
                    'link.hoverlabel.font.color': 'green',
                    'link.hoverlabel.font.family': 'Roboto'
                });
            })
            .then(function() {
                _hover(404, 302);

                assertLabel(
                    ['Solid', 'incoming flow count: 4', 'outgoing flow count: 3', '447TWh'],
                    ['rgb(255, 0, 0)', 'rgb(0, 0, 255)', 20, 'Roboto', 'rgb(0, 0, 0)']
                );
            })
            .then(function() {
                _hover(450, 300);

                assertLabel(
                    ['source: Solid', 'target: Industry', '46TWh'],
                    ['rgb(255, 255, 0)', 'rgb(255, 0, 255)', 18, 'Roboto', 'rgb(0, 128, 0)']
                );
            })
            .catch(failTest)
            .then(done);
        });

        it('should show the correct hover labels when hovertemplate is specified', function(done) {
            var gd = createGraphDiv();
            var mockCopy = Lib.extendDeep({}, mock);

            Plotly.plot(gd, mockCopy).then(function() {
                _hover(404, 302);

                assertLabel(
                    ['Solid', 'incoming flow count: 4', 'outgoing flow count: 3', '447TWh'],
                    ['rgb(148, 103, 189)', 'rgb(255, 255, 255)', 13, 'Arial', 'rgb(255, 255, 255)']
                );
            })
            .then(function() {
                _hover(450, 300);

                assertLabel(
                    ['source: Solid', 'target: Industry', '46TWh'],
                    ['rgb(0, 0, 96)', 'rgb(255, 255, 255)', 13, 'Arial', 'rgb(255, 255, 255)']
                );
            })
            // Test (node|link).hovertemplate
            .then(function() {
                return Plotly.restyle(gd, {
                    'node.hovertemplate': 'hovertemplate<br>%{value}<br>%{value:0.2f}<extra>%{fullData.name}</extra>',
                    'link.hovertemplate': 'hovertemplate<br>source: %{source.label}<br>target: %{target.label}<br>size: %{value:0.0f}TWh<extra>%{fullData.name}</extra>'
                });
            })
            .then(function() {
                _hover(404, 302);

                assertLabel(
                    [ 'hovertemplate', '447TWh', '447.48', 'trace 0'],
                    ['rgb(148, 103, 189)', 'rgb(255, 255, 255)', 13, 'Arial', 'rgb(255, 255, 255)']
                );
            })
            .then(function() {
                _hover(450, 300);

                assertLabel(
                    ['hovertemplate', 'source: Solid', 'target: Industry', 'size: 46TWh', 'trace 0'],
                    ['rgb(0, 0, 96)', 'rgb(255, 255, 255)', 13, 'Arial', 'rgb(255, 255, 255)']
                );
            })
            .catch(failTest)
            .then(done);
        });

        it('should show the correct hover labels with the style provided in template', function(done) {
            var gd = createGraphDiv();
            var mockCopy = Lib.extendDeep({}, mock);
            mockCopy.layout.template = {
                data: {
                    sankey: [{
                        node: {
                            hoverlabel: {
                                bgcolor: 'red',
                                bordercolor: 'blue',
                                font: {
                                    size: 20,
                                    color: 'black',
                                    family: 'Roboto'
                                }
                            }
                        },
                        link: {
                            hoverlabel: {
                                bgcolor: 'yellow',
                                bordercolor: 'magenta',
                                font: {
                                    size: 18,
                                    color: 'green',
                                    family: 'Roboto'
                                }
                            }
                        }
                    }]
                }
            };

            Plotly.plot(gd, mockCopy)
            .then(function() {
                _hover(404, 302);

                assertLabel(
                    ['Solid', 'incoming flow count: 4', 'outgoing flow count: 3', '447TWh'],
                    ['rgb(255, 0, 0)', 'rgb(0, 0, 255)', 20, 'Roboto', 'rgb(0, 0, 0)']
                );
            })
            .then(function() {
                _hover(450, 300);

                assertLabel(
                    ['source: Solid', 'target: Industry', '46TWh'],
                    ['rgb(255, 255, 0)', 'rgb(255, 0, 255)', 18, 'Roboto', 'rgb(0, 128, 0)']
                );
            })
            .catch(failTest)
            .then(done);
        });

        it('should show the correct hover labels even if there is no link.label supplied', function(done) {
            var gd = createGraphDiv();
            var mockCopy = Lib.extendDeep({}, mock);
            delete mockCopy.data[0].link.label;

            Plotly.plot(gd, mockCopy)
                .then(function() {
                    _hover(450, 300);

                    assertLabel(
                        ['source: Solid', 'target: Industry', '46TWh'],
                        ['rgb(0, 0, 96)', 'rgb(255, 255, 255)', 13, 'Arial', 'rgb(255, 255, 255)']
                    );
                })
                .catch(failTest)
                .then(done);
        });

        it('should not show any labels if hovermode is false', function(done) {
            var gd = createGraphDiv();
            var mockCopy = Lib.extendDeep({}, mock);

            Plotly.plot(gd, mockCopy).then(function() {
                return Plotly.relayout(gd, 'hovermode', false);
            })
            .then(function() {
                _hover(node[0], node[1]);
                assertNoLabel();
            })
            .then(function() {
                _hover(link[0], link[1]);
                assertNoLabel();
            })
            .catch(failTest)
            .then(done);
        });

        ['skip', 'none'].forEach(function(hoverinfoFlag) {
            it('should not show node labels if node.hoverinfo is ' + hoverinfoFlag, function(done) {
                var gd = createGraphDiv();
                var mockCopy = Lib.extendDeep({}, mock);

                Plotly.plot(gd, mockCopy).then(function() {
                    return Plotly.restyle(gd, 'node.hoverinfo', hoverinfoFlag);
                })
                .then(function() {
                    _hover(node[0], node[1]);
                    assertNoLabel();
                })
                .catch(failTest)
                .then(done);
            });
        });

        ['skip', 'none'].forEach(function(hoverinfoFlag) {
            it('should not show link labels if link.hoverinfo is ' + hoverinfoFlag, function(done) {
                var gd = createGraphDiv();
                var mockCopy = Lib.extendDeep({}, mock);

                Plotly.plot(gd, mockCopy).then(function() {
                    return Plotly.restyle(gd, 'link.hoverinfo', hoverinfoFlag);
                })
                .then(function() {
                    _hover(link[0], link[1]);
                    assertNoLabel();
                })
                .catch(failTest)
                .then(done);
            });
        });

        ['skip', 'none'].forEach(function(hoverinfoFlag) {
            it('should not show labels if trace hoverinfo is ' + hoverinfoFlag + ' and (node|link).hoverinfo is undefined', function(done) {
                var gd = createGraphDiv();
                var mockCopy = Lib.extendDeep({}, mock);

                Plotly.plot(gd, mockCopy).then(function() {
                    return Plotly.restyle(gd, 'hoverinfo', hoverinfoFlag);
                })
                .then(function() {
                    _hover(node[0], node[1]);
                    assertNoLabel();
                })
                .then(function() {
                    _hover(link[0], link[1]);
                    assertNoLabel();
                })
                .catch(failTest)
                .then(done);
            });
        });

        it('should not show link labels if link.hoverinfo is skip', function(done) {
            var gd = createGraphDiv();
            var mockCopy = Lib.extendDeep({}, mock);

            Plotly.plot(gd, mockCopy).then(function() {
                return Plotly.restyle(gd, 'link.hoverinfo', 'skip');
            })
            .then(function() {
                _hover(link[0], link[1]);
                assertNoLabel();
            })
            .catch(failTest)
            .then(done);
        });
    });

    describe('Test hover/click event data:', function() {
        var gd;

        beforeEach(function() {
            gd = createGraphDiv();
        });

        afterEach(destroyGraphDiv);

        function _makeWrapper(eventType, mouseFn) {
            var posByElementType = {
                node: [404, 302],
                link: [450, 300]
            };

            return function(elType) {
                return new Promise(function(resolve, reject) {
                    gd.once(eventType, function(d) {
                        Lib.clearThrottle();
                        resolve(d);
                    });

                    mouseFn(posByElementType[elType]);
                    setTimeout(function() {
                        reject(eventType + ' did not get called!');
                    }, 100);
                });
            };
        }

        var _hover = _makeWrapper('plotly_hover', function(pos) {
            mouseEvent('mouseover', pos[0], pos[1]);
        });

        var _click = _makeWrapper('plotly_click', function(pos) {
            mouseEvent('click', pos[0], pos[1]);
        });

        var _unhover = _makeWrapper('plotly_unhover', function(pos) {
            mouseEvent('mouseover', pos[0], pos[1]);
            mouseEvent('mouseout', pos[0], pos[1]);
        });

        function _assert(d, expectedPtData) {
            expect(d.event).toBeDefined('original event reference');

            var ptData = d.points[0];
            Object.keys(expectedPtData).forEach(function(k) {
                expect(ptData[k]).toBe(expectedPtData[k], 'point data for ' + k);
            });
        }

        it('should output correct click event data', function(done) {
            var fig = Lib.extendDeep({}, mock);

            Plotly.plot(gd, fig)
            .then(function() { return _click('node'); })
            .then(function(d) {
                _assert(d, {
                    curveNumber: 0,
                    pointNumber: 4,
                    label: 'Solid'
                });
            })
            .then(function() { return _click('link'); })
            .then(function(d) {
                _assert(d, {
                    curveNumber: 0,
                    pointNumber: 61,
                    value: 46.477
                });
            })
            .catch(failTest)
            .then(done);
        });

        it('should output correct hover/unhover event data', function(done) {
            var fig = Lib.extendDeep({}, mock);

            Plotly.plot(gd, fig)
            .then(function() { return Plotly.restyle(gd, 'hoverinfo', 'none'); })
            .then(function() { return _hover('node'); })
            .then(function(d) {
                _assert(d, {
                    curveNumber: 0,
                    pointNumber: 4,
                    label: 'Solid',
                    value: 447.48
                });
                var pt = d.points[0];
                expect(pt.sourceLinks.length).toBe(3);
                expect(pt.targetLinks.length).toBe(4);
            })
            .then(function() { return _hover('link'); })
            .then(function(d) {
                _assert(d, {
                    curveNumber: 0,
                    pointNumber: 61,
                    value: 46.477
                });
                var pt = d.points[0];
                expect(pt.hasOwnProperty('source')).toBeTruthy();
                expect(pt.hasOwnProperty('target')).toBeTruthy();
            })
            .then(function() { return _unhover('node'); })
            .then(function(d) {
                _assert(d, {
                    curveNumber: 0,
                    pointNumber: 4,
                    label: 'Solid'
                });
            })
            .then(function() { return _unhover('link'); })
            .then(function(d) {
                _assert(d, {
                    curveNumber: 0,
                    pointNumber: 61,
                    value: 46.477
                });
            })
            .catch(failTest)
            .then(done);
        });

        function assertNoHoverEvents(type) {
            return function() {
                return Promise.resolve()
                .then(function() { return _hover(type); })
                .then(failTest).catch(function(err) {
                    expect(err).toBe('plotly_hover did not get called!');
                })
                .then(function() { return _unhover(type); })
                .then(failTest).catch(function(err) {
                    expect(err).toBe('plotly_unhover did not get called!');
                });
            };
        }

        it('should not output hover/unhover event data when hovermode is false', function(done) {
            var fig = Lib.extendDeep({}, mock);

            Plotly.plot(gd, fig)
            .then(function() { return Plotly.relayout(gd, 'hovermode', false); })
            .then(assertNoHoverEvents('node'))
            .then(assertNoHoverEvents('link'))
            .catch(failTest)
            .then(done);
        });

        it('should not output hover/unhover event data when trace hoverinfo is skip', function(done) {
            var fig = Lib.extendDeep({}, mock);

            Plotly.plot(gd, fig)
            .then(function() { return Plotly.restyle(gd, 'hoverinfo', 'skip'); })
            .then(assertNoHoverEvents('link'))
            .then(assertNoHoverEvents('node'))
            .catch(failTest)
            .then(done);
        });

        ['node', 'link'].forEach(function(obj) {
            it('should not output hover/unhover event data when ' + obj + '.hoverinfo is skip', function(done) {
                var fig = Lib.extendDeep({}, mock);

                Plotly.plot(gd, fig)
                      .then(function() { return Plotly.restyle(gd, obj + '.hoverinfo', 'skip'); })
                      .then(assertNoHoverEvents(obj))
                      .catch(failTest)
                      .then(done);
            });
        });
    });

    it('emits a warning if node.pad is too large', function(done) {
        var gd = createGraphDiv();
        var mockCopy = Lib.extendDeep({}, mock);

        var warnings = [];
        spyOn(Lib, 'warn').and.callFake(function(msg) {
            warnings.push(msg);
        });
        Plotly.plot(gd, mockCopy).then(function() {
            expect(warnings.length).toEqual(0);

            return Plotly.restyle(gd, 'node.pad', 50);
        })
        .then(function() {
            expect(warnings.length).toEqual(1);
        })
        .catch(failTest)
        .finally(destroyGraphDiv)
        .then(done);
    });
});

function assertLabel(content, style) {
    var g = d3.selectAll('.hovertext');
    var lines = g.selectAll('.nums .line');
    var name = g.selectAll('.name');
    var tooltipBoundingBox = g.node().getBoundingClientRect();
    var nameBoundingBox = name.node().getBoundingClientRect();

    expect(tooltipBoundingBox.top <= nameBoundingBox.top);
    expect(tooltipBoundingBox.bottom >= nameBoundingBox.bottom);

    expect(lines.size()).toBe(content.length - 1);

    lines.each(function(_, i) {
        expect(d3.select(this).text()).toBe(content[i]);
    });

    expect(name.text()).toBe(content[content.length - 1]);

    assertHoverLabelStyle(g, {
        bgcolor: style[0],
        bordercolor: style[1],
        fontSize: style[2],
        fontFamily: style[3],
        fontColor: style[4]
    });
}

function assertNoLabel() {
    var g = d3.selectAll('.hovertext');
    expect(g.size()).toBe(0);
}
