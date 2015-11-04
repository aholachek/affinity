

"use strict";


var d3 = require("d3");
var _ = require("underscore");


//accessible vars
var w,
    h,
    x,
    y,
    kx, //defined in updateBlocks
    ky,
    partition,
    vis,
    dataChangeCallback,
    d3El;


function EditablePartition(config){
  this.el = config.el;
  var localData;
  if (localStorage.affinityDiagram) localData = JSON.parse(localStorage.affinityDiagram);

  this.data = config.data || localData || {};
  this.data = _.extend({root : {name : "topLevelNode", children : [] }, toAdd : [], currentTopLevel : {}}, this.data);
  dataChangeCallback = config.dataChangeCallback || function(){};

}

//called only 1x, setting up the graph
EditablePartition.prototype.render = function(){

  d3El = d3.select(this.el).html("");
  var that = this;
  w = window.innerWidth;
  //104 is default height of .card-creation-container
  h = window.innerHeight - .22 * window.innerHeight,
  x = d3.scale.linear().range([0, w]),
  y = d3.scale.linear().range([0, h]);

  var topRow = d3El.append("div").classed("top-row", true);
   topRow.append("button")
   .classed("show-all", true)
    .text("return to top level")
    .on("click", function(){
          that.data.currentTopLevel = undefined;
          that.update();
        });


  vis = d3El.append("div")
    .attr("class", "chart");

  var created = d3El.append("div").classed("card-creation-container", true);

  var button = created.insert("div")
  .classed("toggle-creation-container", true);

  button.append("div").classed("arrow", true);
  button.on("click", function(){
    if (created.classed("transformed-up")){
      created.classed("transformed-up", false);
    }
    else {
      created.classed("transformed-up", true);
    }
  });

 var createBlock = created.append("div")
 .classed("create-block", true);

createBlock
  .append("textarea")
  .attr("placeholder", "Type and press enter to create a card")
  .on("keypress", function(e){
      if (d3.event.which == 13){
        var t = this;
        var text = d3.select(this.parentElement).select("textarea")[0][0].value;
        that.addBlock(text);
        this.blur();
        this.value = ""
        this.innerHTML = "";
        setTimeout(function(){
          //so dumb, why is this necessary
          t.focus()
        }, 50)
      }
  });


 created.append("div")
    .classed("to-add-container", true);

    partition = d3.layout.partition()
    .value(function(d) { return d.size; });

this.update();
//further calls to render just update the graph
this.render = EditablePartition.prototype.update;

//listen to window resize, automatically call update
window.onresize = function(){
    w = window.innerWidth;
    //104 is default height of .card-creation-container
    h = window.innerHeight - 104 + 30,
    x = d3.scale.linear().range([0, w]),
    y = d3.scale.linear().range([0, h]);
    that.update();
  }

};

EditablePartition.prototype.addBlock = function(text){
  this.data.toAdd.push({name : text, children : [], id : new Date().getTime(), size : 1});
  this.update();
}

function updateToAdd (){
    var toAdd = d3El.select(".to-add-container")
      .selectAll(".to-add-block")
      .data(this.data.toAdd, function(d){return d.id});

    var toAddBlocks = toAdd
      .enter()
      .append("div")
      .classed("to-add-block", true);

    toAddBlocks
      .text(function(d){return d.name});

    toAddBlocks
        .append("button")
        .on("click", function(d){
          that.data.toAdd = _.without(that.data.toAdd, d);
          that.update();
        })
        .classed("delete", true)
        .append("i")
        .classed("fa fa-times", true);

      toAdd.exit().remove();
}

function updateChart (){

var nodeData = partition.nodes(this.data.root);
//any data processing that should be done right before updating
  nodeData.forEach(function(n){
      if (!n.id){
        n.id = new Date().getTime();
      }
    });

  this.data.currentTopLevel = "1";

  // this.data.currentTopLevel = this.data.currentTopLevel || this.data.root.id;

  //show the "show all button if we are not at the top of the hierarchy"
  if (this.data.currentTopLevel  !== this.data.root.id ){
    vis.select(".show-all").style("display", "block");
  }
  else {
    vis.select(".show-all").style("display", "none");
  }

//define variables

    var block = vis.selectAll(".block"),
        dataJoin = block.data(nodeData, function(d){ return d.id }),
        that = this,
        nodeData = partition.nodes(this.data.root),
        currentTopLevel = _.findWhere(nodeData, {id : this.data.currentTopLevel});

    //enter the necessary elements
    var enter =  dataJoin.enter()
        .append("div")
        .classed("block", true)
        .on("click", function(d){
          d3.event.stopPropagation();
          if (!d.children) return;
          that.data.currentTopLevel = d.id;
          that.update();
        })
        .on("mouseenter", function(d){
          if (d.name == "topLevelNode") return;
            var childNodes = getAllChildNodes(this);
            d3.select(this).classed("hovered", true);
            d3.selectAll(childNodes).classed("hovered", true);
        })
        .on("mouseleave", function(d){
          var childNodes = getAllChildNodes(this);
          d3.select(this).classed("hovered", false);
          d3.selectAll(childNodes).classed("hovered", false);
        });

      enter
        .append("button")
        .on("click", function(d){
          removeNode(d, that.data.root);
          that.update();
        })
        .on("mouseenter", function(d){
          var children = getAllChildNodes(this);
          children.push(this.parentElement);
          d3.selectAll(children).classed("highlight-delete", true);
        })
        .on("mouseleave", function(d){
          var children = getAllChildNodes(this);
          children.push(this.parentElement);
          d3.selectAll(children).classed("highlight-delete", false);
        })
        .classed("delete", true)
        .style("display", function(d){
          if (d.depth == 0){
            return "none"
          }
        })
        .append("i")
        .classed("fa fa-times", true);

    enter
    .append("span")
    .text(function(d) { return d.depth !== 0 ? d.name : ""; });

    //working with update selection

    //padding for ability to click back if not the top level
    kx = (currentTopLevel.y ? w - 40 : w) / (1 - currentTopLevel.y);
    ky = h / currentTopLevel.dx;
    x.domain([currentTopLevel.y, 1]).range([currentTopLevel.y ? 40 : 0, w]);
    y.domain([currentTopLevel.x, currentTopLevel.x + currentTopLevel.dx]);

    var topLevelNode = dataJoin.filter(function(d){
      return d.id == currentTopLevel.id;
    })[0][0];
    var parentNode = dataJoin.filter(function(d){
      if (currentTopLevel.parent) return d.id == currentTopLevel.parent.id;
    })[0][0];
    var currentChildren = getAllChildNodes(topLevelNode);
    //push current node
      currentChildren.push(topLevelNode);
      if (currentTopLevel.parent){
        currentChildren.push(parentNode);
      }

    dataJoin
     .each(function(d) {
       //for drag and drop
       d.originalTransform = {x: x(d.y) + 3 * d.depth, y: y(d.x)};
     })
     .style("transform", function(d, i) {
         return "translate(" + (x(d.y) + 3 * d.depth) + "px," + (y(d.x)) + "px)";
       })
    // all blocks are the same width, all should have the same dy (so like .2 * width)
     .style("width", currentTopLevel.dy * kx + "px")
    //dx is the hierarchical height of the object (between 0 and 1), times it by ky (height * toplevel.dx)
     .style("height", function(d) {
       //parent shouldnt be taller than toplevel
       if (this === parentNode){
         return currentTopLevel.dx * ky -3 + "px";
       }
       return d.dx * ky -3 +"px";
      })
     //take care of special style for top level
     .classed("add-top-level-block", function(d){
       if (d.depth == 0) return true;
     })
//hide blocks that are higher in the hierarchy than currentTopLevel
     .style("opacity", function(d){
       if (!_.contains(currentChildren, this)){
         return 0;
       }
       return 1;
     });

    //remove exit selection
    dataJoin.exit().remove();

    var drag = d3.behavior.drag()
                .origin(function(d){
                  return {x : d.originalTransform.x , y : d.originalTransform.y}
                })
                .on('drag', function(d) {
                  var childNodes = getAllChildNodes(this);

                   d3.select(this)
                   .style('transform', 'translate(' + d3.event.x + "px , " + d3.event.y + "px)")
                   .classed("being-dragged", true);

                   var diff = {x : d3.event.x - d.originalTransform.x , y : d3.event.y - d.originalTransform.y };

                   d3.selectAll(childNodes)
                   .style("transform", function(d){
                     return "translate(" + ( d.originalTransform.x + diff.x) + "px, " + (d.originalTransform.y + diff.y ) + "px)";
                   })
                   .classed("being-dragged", true);
                   highlightHoveredRect(d3.event);
                  })
                .on('dragend', function(){
                  var block = vis.selectAll(".block"),
                      hovered = block.filter(function(d){
                        return d3.select(this).classed("hover-add");
                      });

                  if ( hovered[0].length && !_.contains(hovered[0][0].__data__.children, this.__data__ )){
                    //it's already the parent
                      removeNode(this.__data__, that.data.root);
                      addNode(this.__data__, hovered[0][0].__data__, that.data.root);
                      that.update();
                  }
                  else {
                    //put the dragged elements back where they came from
                    vis.selectAll(".being-dragged")
                    .style("transform", function(d) {
                      return "translate(" + (x(d.y) + 3 * d.depth) + "px," + (y(d.x)) + "px)";
                  })
                }
                  block.classed({"being-dragged" : false, "hover-add" : false});
                });

    var dragToAdd = d3.behavior.drag()
                            .on("dragstart", function(){
                              d3El.select(".card-creation-container").classed("transformed-up", false);
                              d3.select(this).classed("being-dragged", true);
                            })
                            .on('drag', function(d) {

                              var translateX =  d3.event.x,
                                  translateY = d3.event.y;

                               d3.select(this).style("transform", "translate(" + translateX + "px," +  translateY + "px)");
                               highlightHoveredRect(d3.event);
                              })
                            .on('dragend', function(){

                              var block = vis.selectAll(".block"),
                                  hovered = block.filter(function(d){
                                  return d3.select(this).classed("hover-add");
                              });

                              document.querySelector(".to-add-container").appendChild(this);

                              if ( hovered[0].length ){
                                that.data.toAdd = _.without(that.data.toAdd, this.__data__);
                                addNode(this.__data__, hovered[0][0].__data__, that.data.root);
                                that.update();
                              }
                              else {
                                //put the dragged elements back where they came from
                                d3El.selectAll(".being-dragged")
                                .classed("being-dragged", false)
                                .style("transform", function(d) {
                                  return "translate(0px,0px)";
                              });
                            }
                            block.classed({"being-dragged" : false, "hover-add" : false});
                            });


     d3El.selectAll(".to-add-block").on("mousedown", function(d){
       //append to chart
          var initialPosition = this.getBoundingClientRect();
          document.querySelector("#content").appendChild(this);
           var newPosition = this.getBoundingClientRect();
           //make adjustments
           var origin = [initialPosition.left - newPosition.left, initialPosition.top - newPosition.top];
           dragToAdd.origin(function(){return {x : origin[0], y : origin[1]}});
           d3.select(this).style("transform", "translate(" + origin[0] + "px," + origin[1] + "px)");
           //set drag behavior origin
     }).call(dragToAdd);
     d3El.selectAll(".block").call(drag);
}


EditablePartition.prototype.update = function(){

  var that = this;
  //save to local storage
  removeParents(this.data.root);
  localStorage.affinityDiagram = JSON.stringify(this.data);
  updateToAdd.call(this);
  updateChart.call(this);

}

function removeParents(data){
  function deleteParent(children){
    _.each(children, function(c){
      delete c.parent;
      if (c.children){
        deleteParent(c.children)
      }
    })
  }
  deleteParent(data.children);
}


  function getAllChildNodes(node){
    var childIds = [];
    function appendChildren(children){
      _.each(children, function(c){
        childIds.push(c.id);
        if (c.children && c.children.length){
          appendChildren(c.children)
        }
      })
    }
    appendChildren(node.__data__.children);
    return vis.selectAll(".block").filter(function(d){
      if (_.contains(childIds, d.id)) return true;
    })[0];
  }

  function removeNode (nodeDataToRemove, root){
    var removed = false;
    function traverseRoot(root){
      if (removed) return;
      _.each(root.children, function(c, index){
        if (c.id == nodeDataToRemove.id){
          root.children = _.without(root.children, c);
          removed = true;
        }
        else {
          if (c.children) {
            traverseRoot(c);
          }
        }
      })
    }
    traverseRoot(root);
    if (removed == false)  throw new Error("Was not able to find node in the this.data.root");
  }

  function addNode (nodeDataToAdd, newParentNodeData, root){
    var added = false;
    function traverseRoot(root){
      if (added) return;
      if (root.id == newParentNodeData.id){
        root.children = root.children || [];
        root.children.push(nodeDataToAdd);
        added = true;
        return
      }
      _.each(root.children, function(c, index){
        if (c.id == newParentNodeData.id){
          c.children = c.children || [];
          c.children.push(nodeDataToAdd);
          added = true;
          return
        }
        else {
          if (c.children) traverseRoot(c);
        }
      })
    }
    traverseRoot(root);
    if (!added)  throw new Error("Couldn't find new parent node");

  }


  function getHovered(e){
    var block = vis.selectAll(".block");
    var mouseX = e.sourceEvent.clientX, mouseY =  e.sourceEvent.clientY;

    return block.filter(function(d){
      var blockBounding = this.getBoundingClientRect(),
      bStartX = blockBounding.left,
      bStartY = blockBounding.top,
      bEndX = bStartX + blockBounding.width,
      bEndY = bStartY + blockBounding.height;

      if ( bStartX < mouseX && bStartY < mouseY && bEndX > mouseX && bEndY > mouseY ){
        if (!d3.select(this).classed("being-dragged")){
          return true;
          }
        }
    });
  }

  function highlightHoveredRect(e){
    var block = vis.selectAll(".block"),
        hoveredRect = getHovered.apply(undefined,arguments);
        block.classed("hover-add", false);

      if (hoveredRect){
        hoveredRect.classed("hover-add", true);
      }
  }


  module.exports = EditablePartition;
