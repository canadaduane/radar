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

/**
 * Underscore string descending sortBy
 * usage:
 *   Sort by name ascending `_.sortBy(data, string_comparator('name'));`
 *   Sort by name descending `_.sortBy(data, string_comparator('-name'));`
 */
var string_comparator = function(param_name, compare_depth) {
  if (param_name[0] == '-') {
    param_name = param_name.slice(1),
    compare_depth = compare_depth || 10;
    return function (item) {
       return String.fromCharCode.apply(String,
        _.map(item[param_name].slice(0, compare_depth).split(""), function (c) {
          return 0xffff - c.charCodeAt();
        })
      );
    };
  } else {
    return function (item) {
      return item[param_name];
    };
  }
};

var reverseStringCompare = function (str) {
  return String.fromCharCode.apply(String,
    _.map(str.slice(0, 10).split(""), function (c) {
      return 0xffff - c.charCodeAt();
    })
  );
};

var renderTags = function(post) {
  var $this = $(post.firstNode);

  var i, j;
  var tagsByName = postTagsByName(post.data);
  var postTags = _.keys(tagsByName);

  var allTags = function() {
    var tags = Tags.find({}).fetch();
    return _.map(tags, function(tag) {
      return {id: tag.name, text: tag.name || ""};
    });
  };

  var tagDisplay = function(selectedTags) {
    if(selectedTags && selectedTags.length) {
      var html = _.chain(selectedTags).
        map(function(tag) {
          var weight = (tagsByName[tag] ? (tagsByName[tag].weight || 1) : 1);
          return {
            text: $.fn.editableutils.escape(tag),
            weight: weight,
            cls: "tag-weight-" + weight
          };
        }).
        sortBy(function(data) {
          return [data.weight, reverseStringCompare(data.text)];
        }).reverse().
        map(function(data) {
          return "<span class='tag " + data.cls + "'>" + data.text +
                 "<span class='decal'>" + data.weight + "</span></span>";
        }).value();
      $(this).html(html.join(' '));
    } else {
      $(this).empty(); 
    }
  };

  $('.tags', $this).unbind('save').on('save', function(e, params) {
    return (function(postId, tags) {
      // console.log('setAudienceTags', postId, tags);
      Meteor.call('setAudienceTags', postId, tags);
    })(post.data._id, params.submitValue);
  }).editable({
    mode: 'popup',
    autotext: 'always',
    emptytext: 'Add Target Audience',
    placement: 'right',
    type: 'select2',
    display: tagDisplay,
    value: postTags,
    select2: {
      openOnEnter: false,
      tags: allTags,
      tokenSeparators: [",", " "]
    }
  });

  // $('.tags', $this).unbind('')
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