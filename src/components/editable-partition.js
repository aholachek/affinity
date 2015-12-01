"use strict";

var containerTemplate = require("./container.handlebars");
var overlayTemplate = require("./overlay.handlebars");
var blockTemplate = require("./block.handlebars");
var buttonRowTemplate = require('./buttonrow.handlebars');
var flare = require('./flare.js');

var d3 = require("d3");
var _ = require("underscore");
var Drop = require('tether-drop');


function EditablePartition(config) {
  this.el = config.el;
  //defined in 'render'
  this.partition = undefined;
  this.state = {
    //value : node that has a dropdown
    drop: undefined,
    //value : node that composes the overlay
    overlay: undefined,
    //the id from the data of the top level node
    currentTopLevel: undefined,
    //bool
    compact: false
  };

  var localData;
  if (localStorage.affinityDiagram) localData = JSON.parse(localStorage.affinityDiagram);

  this.data = config.data || localData || {};
  this.data = _.extend({
    root: {
      name: undefined,
      children: [],
      id: 1,
      size: 1
     },
    toAdd: [],
  }, this.data);

}

//called only 1x, setting up the graph
EditablePartition.prototype.render = function() {

  var d3El = d3.select(this.el).html(containerTemplate()),
      that = this;

  d3El.select(".show-all")
    .on("click", function() {
      that.state.currentTopLevel = that.data.root.id;
      that.update();
    });

  d3El.select(".toggle-creation-container").on("click", function() {
    if (d3El.classed("show-create-dropdown")) {
      d3El.classed("show-create-dropdown", false);
    } else {
      d3El.classed("show-create-dropdown", true);
    }
  });

  var createBlock = d3El.select(".to-add-container");

  d3El.select(".create-block textarea")
    .on("keypress", function(e) {
      if (d3.event.which === 13) {
        var t = this;
        var text = d3.select(this.parentElement).select("textarea")[0][0].value;
        that.addBlock(text);
        this.blur();
        this.value = ""
        this.innerHTML = "";
        setTimeout(function() {
          //so dumb, why is this necessary
          t.focus();
        }, 50);
      }
    });

  this.partition = d3.layout.partition()
    .value(function(d) {
      //right now, 1 entry = 1 point
      return 1;
    })
    .sort(function(a, b) {
      //so that a block with a child will read as bigger than a block w/no children
      //this only works since all blocks have a val of 1
      var aVal = getAllChildren(a).length;
      var bVal = getAllChildren(b).length;
      if (aVal !== bVal) {
        return bVal - aVal;
      } else {
        return b.id - a.id;
      }
    });

  //listen to window resize, automatically call update
  window.onresize = function() {
    if (that.state.cardOverlay) return;
    //prevent forced synchronous layout by caching these vals
    that.state.chartWidth = document.querySelector(".chart").clientWidth;
    that.state.windowHeight = window.innerHeight;
    that.update();
  }

  d3El.on("click", function() {
    if (d3.event.target.classList.contains("overlay")) {
      that.state.cardOverlay = null;
      that.update();
    }
  });

  d3.select(".delete-everything").on("click", function() {
    that.data = {
      root: {
        name: "Untitled",
        children: [],
        id: 1,
        size: 1
      },
      toAdd: [],
    };
    that.state.currentTopLevel = 1;
    that.update();
  });

  d3.select(".download-as-json").on("click", function() {

    //prevent circular references
    removeParents(that.data.root)
      //get a copy
    var data = cleanDataForJSONExport(that.data.root);
    cleanDataForJSONExport(data);

    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(
      data));
    var span = d3.select("#content").append("span").html('<a href="data:' +
      data + '" download="data.json">download JSON</a>');
    span.select("a")[0][0].dispatchEvent(new MouseEvent('click', {
      'view': window,
      'bubbles': true,
      'cancelable': true
    }));

    span.remove();

  });

  d3El.select(".btn-expand").on("click", function() {
    that.state.compact = false;
    that.update();
  });

  d3El.select(".btn-compact").on("click", function() {
    that.state.compact = true;
    that.update();
  });

  d3El.select(".load-sample-data").on("click", function(){
        that.data.root = JSON.parse(JSON.stringify(flare));
        that.state.currentTopLevel = null;
        that.update();
  });

  //after events have already been attached to the buttons,
  //since this removes html
  var dropdownDrop = new Drop({
    target: document.querySelector('.dropdown-button'),
    content: document.querySelector('.dropdown-hidden ul'),
    openOn: 'click',
    position: "bottom right",
    classes: 'drop-theme-arrows-bounce-dark',
    constrainToWindow: false,
    constrainToScrollParent: false
  });

  //allow title edits
  d3.select(".project-title").on("keydown", function(){
    var that = this;
    if (d3.event.which == 13) {
      d3.event.preventDefault();
      that.blur();
    }
  }).on("blur", function() {
    that.data.root.name = this.textContent.trim();
    that.update();
  });

  //prevent forced synchronous layout by caching these vals
  this.state.chartWidth = document.querySelector(".chart").clientWidth;
  this.state.windowHeight = window.innerHeight;

  this.update();
  //further calls to render just update the graph
  this.render = EditablePartition.prototype.update;

};

EditablePartition.prototype.update = function() {

  var that = this;
  //save to local storage
  removeParents(this.data.root);
  localStorage.affinityDiagram = JSON.stringify(this.data);
  updateToAdd.call(this);
  updateChart.call(this);
  //cheating a bit since will never have to update overlay when
  //not stricly neccessary, so no weird repeat animations will happen
  updateOverlayState.call(this);

};

function updateOverlayState(){

  var that = this,
      blockEl = this.state.cardOverlay,
      d3Block = d3.select(blockEl);

  if (this.state.cardOverlay){
    d3.select("#content").classed("has-overlay", true);

    d3Block
      .classed("card-overlay", true)
      .classed("show-all-hover", false)
      .transition()
      .style("width", "600px")
      .style("height", "400px")
      .styleTween('transform', function(d) {
        var bounding = document.querySelector(".chart").getBoundingClientRect();
        var offset = [bounding.left, bounding.top];
        var translateX = (window.innerWidth + offset[0]) /
          2 - 300,
          translateY = (window.innerHeight - offset[1] + window.scrollY) /
            2 - 200,
          start = this.style.transform,
          end = 'translate(' + translateX + 'px,' + translateY + 'px)';

        return d3.interpolateString(start, end);
      });

    d3Block
      .select(".overlay-container")
      .html(overlayTemplate({
        text: blockEl.__data__.name
      }))
      //prevent interaction with drag handler
      .on("mousedown", function() {
        d3.event.stopPropagation();
      })
      //keydown and keypress don't work, textcontent isnt updated
      .select("div[contenteditable]").on("keyup", function(d) {
        d.name = this.textContent.trim();
        d3Block.select(".not-overlay .text").text(d.name);
      });

    d3Block.select(".back-to-chart")
      .on("click", function(d) {
        d3.event.stopPropagation();
        that.state.cardOverlay = null;
        that.update();
      });
  }
  else {
    //close overlay
    d3Block = d3.select(".card-overlay");
    d3.select("#content").classed("has-overlay", false);
    if (d3Block){
      d3Block
        .style("z-index", "10")
        .classed("card-overlay", false)
        .select(".overlay-container").html("");
      setTimeout(function() {
        d3Block.style("z-index", null);
      });
    }
  }
};

EditablePartition.prototype.addBlock = function(text) {
  this.data.toAdd.push({
    name: text,
    children: [],
    id: new Date().getTime(),
    size: 1
  });
  this.update();
}

function updateToAdd() {
  var that = this;
  var toAdd = d3.select(this.el).select(".to-add-container");

  var toAddJoin = toAdd.selectAll(".to-add-block")
    .data(this.data.toAdd, function(d) {
      return d.id
    });

  var enter = toAddJoin
    .enter()
    .append("div")
    .classed("to-add-block", true)
    .text(function(d) {
      return d.name
    });

  enter
    .append("button")
    .on("mousedown", function() {
      //prevent drag listener from hijacking
      d3.event.stopPropagation();
    })
    .on("click", function(d) {
      that.data.toAdd = _.without(that.data.toAdd, d);
      that.update();
    })
    .classed("delete", true)
    .append("i")
    .classed("fa fa-times", true);

  toAddJoin.exit().remove();

  var dragToAdd = d3.behavior.drag()
    .on("dragstart", function() {
      d3.select("#content").classed("show-create-dropdown", false);
      d3.select(this).classed("being-dragged", true);
    })
    .on('drag', function(d) {

      var translateX = d3.event.x,
        translateY = d3.event.y;

      d3.select(this).style("transform", "translate(" + translateX + "px," +
        translateY + "px)");
      highlightHoveredRect(d3.event, this);
    })
    .on('dragend', function() {

      var block = d3.selectAll(".inclusive-block"),
        hovered = [].slice.apply(document.querySelectorAll(".inclusive-block"))
        .filter(function(el) {
          if (el.classList.contains("hover-add")) {
            return true
          }
        });

      document.querySelector(".to-add-container").appendChild(this);

      if (hovered.length) {
        //top level block doesnt have data
        var data = hovered[0].classList.contains("top-level-block") ? that.data
          .root : hovered[0].__data__;
        that.data.toAdd = _.without(that.data.toAdd, this.__data__);
        addNode(this.__data__, data, that.data.root);
        that.update();
      } else {
        //put the dragged elements back where they came from
        d3.select(this)
          .classed("being-dragged", false)
          .style("transform", function(d) {
            return "translate(0px,0px)";
          });
      }
      //re-show card creation container
      if (that.data.toAdd.length >= 1) {
        d3.select("#content").classed("show-create-dropdown", true);
      }
      block.classed({
        "being-dragged": false,
        "hover-add": false
      });
    });

  enter.on("mousedown", function(d) {
    //append to chart
    var initialPosition = this.getBoundingClientRect();
    document.querySelector("#content").appendChild(this);
    var newPosition = this.getBoundingClientRect();
    //make adjustments
    var origin = [initialPosition.left - newPosition.left, initialPosition.top -
      newPosition.top
    ];
    dragToAdd.origin(function() {
      return {
        x: origin[0],
        y: origin[1]
      }
    });
    d3.select(this).style("transform", "translate(" + origin[0] + "px," +
      origin[1] + "px)");
    //set drag behavior origin
  }).call(dragToAdd);

}

function updateChart() {

  var projectTitle = this.data.root.name === "Untitled" ? "Untitled (click to edit)" : this.data.root.name;
  d3.select(".project-title").text(projectTitle);

  var d3El = d3.select(this.el).select(".chart"),
    nodeData = this.partition.nodes(this.data.root);

    d3.selectAll(".drop").remove();

    d3.selectAll(".compact-btn-container button").classed("active", false);

    if (this.state.compact) {
      d3.select(".btn-compact").classed("active", true);
    } else {
      d3.select(".btn-expand").classed("active", true);
    }

  //if no chart, don't try to render anything, just make sure all cards other than
  //top level are gone
    if (!this.data.root.children || !this.data.root.children.length ){
      d3El.selectAll(".block").remove();
      //back to default
      d3El.select(".top-level-block").style("height", null);
      d3El.select(".chart").style("height", null);
      d3El.select(".intro-instructions").classed("hidden", false);
      return;
    }
    else {
      d3El.select(".intro-instructions").classed("hidden", true);
    }

  var w = this.state.chartWidth - 43, //43 is the width of the first block, kind of hacky,
  h = this.state.windowHeight - 100 - 15; //padding + toolbar

  //if chart is imported from elsewhere
  _.each(nodeData, function(n) {
    if (!n.id) {
      n.id = _.uniqueId();
      n.size = 1;
      n.value = null;
    }
  });

  //now, assign a currentTopLevel to state if it's not already there
  //we are doing it later since e.g. flare import just got assigned ids above
  if (!this.state.currentTopLevel){
    this.state.currentTopLevel = this.data.root.id;
  }

  nodeData = this.partition.nodes(this.data.root);

  //define variables

  var block = d3El.selectAll(".block"),
    that = this,
    minWidth = 80,
    maxLevels = Math.floor(w / minWidth),
    currentTopLevel = _.findWhere(nodeData, {
          id: that.state.currentTopLevel
        });

   if (!currentTopLevel){
     console.error("could not find the current top level, data out of sync!", this);
     return
   }

  nodeData = _.filter(nodeData, function(f) {
    //if hierarchy goes too far, just show top n levels
    //remember that depth is zero indexed
    if (f.depth - currentTopLevel.depth < maxLevels - 1) {
      return true
    }
  });

  var dataJoin = block.data(nodeData, function(d) {
      return d.id
    }),
    numLevels = _.max(nodeData.map(function(n) {
      return n.depth
    })) - currentTopLevel.depth;
  numLevels = currentTopLevel.depth > 0 ? numLevels += 1 : numLevels;

  var topLevelBlockWidth = 43; //40 + padding

  if (currentTopLevel.depth > 0) {
    d3.select(".top-level-block .fa-home").classed("active", true)
  } else {
    d3.select(".top-level-block .fa-home").classed("active", false)
  }

  //remove exit selection
  dataJoin.exit().transition().style("opacity", 0).remove();

  //utility function for closing dropdowns
  function closeDrops(node) {
    d3.selectAll(".drop").remove();
    if (that.state.drop === node) {
      that.state.drop = null
      return false
    } else {
      return true
    }
  }

  //enter the necessary elements
  var enter = dataJoin.enter()
    .append("div")
    .classed("block", true)
    .on("click", function(d) {
      //toggles current drop
      if (!closeDrops(this)) return;
      if (d.dragged) return;
      //if currently in overlay state, return
      if (this.classList.contains("card-overlay")) return;

      var dropInstance = new Drop({
        target: this,
        content: buttonRowTemplate({
          hasChildren: d.children && d.children.length
        }),
        classes: 'drop-theme-arrows-bounce-dark',
        position: 'bottom left',
        openOn: null,
        constrainToWindow: false,
        constrainToScrollParent: false
      });
      dropInstance.open();
      that.state.drop = this;
      addButtonEvents(dropInstance.content, this);
    })
    .classed("hidden", function(d) {
      //always hide top level node
      if (d.depth === 0) return true
    })
    .classed("inclusive-block", function(d) {
      //always hide top level node
      //this class also belongs to left hand home block
      if (d.depth > 0) return true
    })
    .style("opacity", 0)
    .html(blockTemplate())


  function addButtonEvents(dropdownEl, blockEl) {
    var buttonRow = d3.select(dropdownEl).select(".button-row");

    buttonRow.select(".hierarchy-zoom")
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return;
        if (!blockEl.__data__.children) return;
        that.state.currentTopLevel = blockEl.__data__.id;
        that.state.compact = true;
        that.update();
      })
      .on("mouseenter", function(d) {
        var childNodes = getAllChildNodes(blockEl);
        d3.select(blockEl).classed("hovered", true);
        d3.selectAll(childNodes).classed("hovered", true);
      })
      .on("mouseleave", function(d) {
        var childNodes = getAllChildNodes(blockEl);
        d3.select(blockEl).classed("hovered", false);
        d3.selectAll(childNodes).classed("hovered", false);
      });

    buttonRow.select(".delete")
      .on("click", function(d) {
        removeNode(blockEl.__data__, that.data.root);
        that.update();
      })
      .on("mouseenter", function(d) {
        var children = getAllChildNodes(blockEl);
        children.push(blockEl);
        d3.selectAll(children).classed("highlight-delete", true);
      })
      .on("mouseleave", function(d) {
        var children = getAllChildNodes(blockEl);
        children.push(blockEl);
        d3.selectAll(children).classed("highlight-delete", false);
      });

    buttonRow.select(".show-all-text")
    .on("mouseenter", function(d) {
      d3.select(blockEl).classed("show-all-hover", true);
    })
    .on("mouseleave", function(d) {
      d3.select(blockEl).classed("show-all-hover", false);
    })
      .on("click", function() {
        closeDrops(blockEl);
        that.state.cardOverlay = blockEl;
        that.update();
      });
  }

  //end addButtonEvents

  enter.select(".text")
    .text(function(d) {
      return d.name;
    });

  //override h to ensure readable, scrollable graph
  if (!that.state.compact) {
    var visibleNodes = getAllChildren(currentTopLevel);
    var minHeight = 25,
        smallestDX = d3.min(visibleNodes.map(function(n) {
        return n.dx
      }))/currentTopLevel.dx,
        totalHeight = minHeight / smallestDX,
        h = d3.max([totalHeight, h]);
  }

  var ky = h / currentTopLevel.dx,
      y = d3.scale.linear().domain([currentTopLevel.x, currentTopLevel.x +
      currentTopLevel.dx
    ])
    .range([0, h]);

  //set the height of the chart
  d3.select(".top-level-block").style("height",  h - 3 + "px");
  //wrapper div prevents y overflow while allowing x overflow
  d3.select(".chart").style("height", h + "px");

  dataJoin
  //for enter selection
    .style("opacity", null)
    .classed("has-children", function(d) {
      if (d.children && d.children.length) {
        return true
      }
    })
    .classed("hovered", false);

  //these transitions look better w javascript
  var transition = dataJoin.transition()
    .duration(400)
    // all blocks are the same width, all should have the same y (so like .2 * width)
    .style("width", (1 / numLevels * w - 3) + "px")
    //dx is the hierarchical height of the object (between 0 and 1), times it by ky (height * toplevel.dx)
    .style("height", function(d) {
      //parent shouldnt be taller than toplevel
      var spacer = that.state.compact? 1 : 3;
      var height = d.dx * ky - spacer;
      d3.select(this).classed("no-text", function(d) {
        if (height < 15) {
          return true;
        }
      });
      return height + "px";
    });

  function translateTween(d) {
    //when top level is "home", still act like it is the second level
    var start = this.style.transform || 'translate(0px,0px)',
      currentDepth = currentTopLevel.depth == 0 ? 1 : currentTopLevel.depth,
      blockWidth = 1 / numLevels * w,
      blockDepth = d.depth - currentDepth,
      xTransform = blockWidth * blockDepth + topLevelBlockWidth,
      yTransform = y(d.x),
      end = "translate(" + xTransform + "px," + yTransform + "px)";
    //for drag and drop
    d.originalTransform = {
      x: xTransform,
      y: yTransform
    };

    return d3.interpolateString(start, end);

  }

  transition.styleTween('transform', translateTween);

  var drag = d3.behavior.drag()
    .origin(function(d) {
      return {
        x: d.originalTransform.x,
        y: d.originalTransform.y
      }
    })
    .on("dragstart", function() {
      if (d3.select(this).classed("show-all-text")) return;
      d3.select(this).classed("being-dragged", true);
      this.__data__.dragged = true;
    })
    .on('drag', function(d) {
      var childNodes = getAllChildNodes(this);

      d3.select(this)
        .style('transform', 'translate(' + d3.event.x + "px , " + d3.event.y +
          "px)")
        .classed("being-dragged", true);

      var diff = {
        x: d3.event.x - d.originalTransform.x,
        y: d3.event.y - d.originalTransform.y
      };

      d3.selectAll(childNodes)
        .style("transform", function(d) {
          return "translate(" + (d.originalTransform.x + diff.x) + "px, " +
            (d.originalTransform.y + diff.y) + "px)";
        })
        .classed("being-dragged", true);
      highlightHoveredRect(d3.event, this);
    })
    .on('dragend', function() {
      var node = this;
      var block = d3.selectAll(".inclusive-block"),
        hovered = [].slice.apply(document.querySelectorAll(".inclusive-block"))
        .filter(function(el) {
          if (el.classList.contains("hover-add")) {
            return true
          }
        });

      if (hovered.length) {
        //top level block doesnt have data
        var hoveredData = hovered[0].classList.contains("top-level-block") ?
            that.data.root : hovered[0].__data__;
        removeNode(this.__data__, that.data.root);
        addNode(this.__data__, hoveredData, that.data.root);
        that.update();
      }
      else {
        //put the dragged elements back where they came from
        d3El.selectAll(".being-dragged")
          .transition()
          .styleTween('transform', function(d) {
              var start = this.style.transform,
                  end = "translate(" + d.originalTransform.x + "px," + d.originalTransform.y + "px)";
              return d3.interpolateString(start, end);
            });

      }
      block.classed({
        "being-dragged": false,
        "hover-add": false
      });
      var vals = this.style.transform.match(/\d+.?\d*px/g);
      _.each(vals, function(v, i) {
        vals[i] = parseFloat(v.split("px")[0])
      });
      //
      if (vals[0] - this.__data__.originalTransform.x > 4 || vals[0] - this.__data__
        .originalTransform.x < -4 || vals[1] - this.__data__.originalTransform
        .y > 4 || vals[1] - this.__data__.originalTransform.y < -4
      ) {
        setTimeout(function() {
          node.__data__.dragged = false
        }, 500);
      } else {
        node.__data__.dragged = false
      }
    });

  enter.call(drag);
}


function removeParents(data) {
  function deleteParent(children) {
    _.each(children, function(c) {
      delete c.parent;
      if (c.children) {
        deleteParent(c.children)
      }
    })
  }
  deleteParent(data.children);
}

function cleanDataForJSONExport(data) {
  var newData;

  function without(obj) {
    return _.pick(obj, ["name", "size", "id"]);
  }

  function clean(node, list) {
    //cache list of children
    var children = node.children;
    if (!list) {
      //it's the top level
      newData = without(node);
      node = newData;
    } else {
      node = without(node);
      list.push(node);
    }

    node.children = [];

    _.each(children, function(c) {
      clean(c, node.children);
    });

  }
  clean(data);
  return newData;
}

function getAllChildren(data) {
  var allChildren = [];

  function appendChildren(children) {
    _.each(children, function(c) {
      allChildren.push(c);
      if (c.children && c.children.length) {
        appendChildren(c.children)
      }
    })
  }
  appendChildren(data.children);
  return allChildren;
}

function getAllChildNodes(node) {
  var allChildren = getAllChildren(node.__data__),
    childIds = _.map(allChildren, function(c) {
      return c.id
    });
  return d3.selectAll(".block").filter(function(d) {
    if (_.contains(childIds, d.id)) return true;
  })[0];
}

function removeNode(nodeDataToRemove, root) {
  var removed = false;

  function traverseRoot(root) {
    if (removed) return;
    _.each(root.children, function(c, index) {
      if (c.id == nodeDataToRemove.id) {
        root.children = _.without(root.children, c);
        removed = true;
      } else {
        if (c.children) {
          traverseRoot(c);
        }
      }
    })
  }
  traverseRoot(root);
  if (removed == false) throw new Error(
    "Was not able to find node in the this.data.root");
}

function addNode(nodeDataToAdd, newParentNodeData, root) {
  var added = false;

  function traverseRoot(root) {
    if (added) return;
    if (root.id == newParentNodeData.id) {
      root.children = root.children || [];
      root.children.push(nodeDataToAdd);
      added = true;
      return
    }
    _.each(root.children, function(c, index) {
      if (c.id == newParentNodeData.id) {
        c.children = c.children || [];
        c.children.push(nodeDataToAdd);
        added = true;
        return
      } else {
        if (c.children) traverseRoot(c);
      }
    })
  }
  traverseRoot(root);
  if (!added) throw new Error("Couldn't find new parent node");

}

function getHovered(e) {
  var block = d3.selectAll(".inclusive-block");
  var mouseX = e.sourceEvent.clientX,
    mouseY = e.sourceEvent.clientY;

  return block.filter(function(d) {
    var blockBounding = this.getBoundingClientRect(),
      bStartX = blockBounding.left,
      bStartY = blockBounding.top,
      bEndX = bStartX + blockBounding.width,
      bEndY = bStartY + blockBounding.height;

    if (bStartX < mouseX && bStartY < mouseY && bEndX > mouseX && bEndY >
      mouseY) {
      if (!d3.select(this).classed("being-dragged")) {
        return true;
      }
    }
  });
}

function highlightHoveredRect(e, node) {
  var block = d3.selectAll(".inclusive-block");
  var hoveredRect = getHovered.apply(undefined, arguments);
  block.classed("hover-add", false);

  if (hoveredRect) {
    hoveredRect.classed("hover-add", true);
  }
}


module.exports = EditablePartition;
