Template.postItem.helpers({
  ownPost: function() {
    return this.userId == Meteor.userId();
  },
  domain: function() {
    var a = document.createElement('a');
    a.href = this.url;
    return a.hostname;
  },
  upvotedClass: function() {
    var userId = Meteor.userId();
    if (userId && !_.include(this.upvoters, userId)) {
      return 'btn-primary upvotable';
    } else {
      return 'disabled unupvotable';
    }
  }
});

var renderTags = function(post) {
  var $this = $(post.firstNode);
  console.log('post', post);
  
  $.fn.editable.defaults.mode = 'popover';

  // var postTags = 
  var tagsByName = {};

  // _.each(tags, function(tag) {
  //   tagsByName[tag.name] = tag;
  // });
  // var tagNames = _.map(tags, function(tag) { return tag.name || ""; });

  var allTags = function() {
    var tags = Tags.find({}).fetch();
    return _.map(tags, function(tag) {
      return {id: tag.name, text: tag.name || ""};
    });
  };

  var tagFormatResult = function(object, container, query) {
    $(container).append("<span class='btn'>" + object.text + "</span>");
  };

  var tagDisplay = function(selectedTags) {
    var html = [];
    if(selectedTags && selectedTags.length) {
      $.each(selectedTags, function(i, v) {
        var text = $.fn.editableutils.escape(v);
        var weight = tagsByName[v] ? (tagsByName[v].weight || 0) : 0;
        var cls = "tag-weight-" + weight;
        html.push("<span class='tag " + cls + "'>" + text + "</span>");
      });
      $(this).html(html.join(' '));
    } else {
      $(this).empty(); 
    }
  };

  $('.tags', $this).on('change', function(a) {
    console.log('change', a);
  }).editable({
    emptytext: 'Add Target Audience',
    placement: 'right',
    type: 'select2',
    display: tagDisplay,
    select2: {
      openOnEnter: false,
      tags: allTags,
      tokenSeparators: [",", " "]
    }
  });
};

Template.postItem.rendered = function(){
  // Render tag pills
  renderTags(this);

  // animate post from previous position to new position
  var instance = this;
  var rank = instance.data._rank;
  var $this = $(this.firstNode);
  var postHeight = 80;
  var newPosition = rank * postHeight;

  
  // if element has a currentPosition (i.e. it's not the first ever render)
  if (typeof(instance.currentPosition) !== 'undefined') {
    var previousPosition = instance.currentPosition;
    // calculate difference between old position and new position and send element there
    var delta = previousPosition - newPosition;
    $this.css("top", delta + "px");
  } else {
    // it's the first ever render, so hide element
    $this.addClass("invisible");
  }
  
  // let it draw in the old position, then..
  Meteor.defer(function() {
    instance.currentPosition = newPosition;
    // bring element back to its new original position
    $this.css("top",  "0px").removeClass("invisible");
  }); 
};

Template.postItem.events({
  'click .upvotable': function(e) {
    e.preventDefault();
    Meteor.call('upvote', this._id);
  },
  'click .unupvotable': function(e) {
    e.preventDefault();
    Meteor.call('unupvote', this._id);
  }
});