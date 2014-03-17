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

var addCommas = function(nStr) {
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
};

var renderTags = function(post) {
  var $this = $(post.firstNode);

  var i, j;
  var tagsByName = postTagsByName(post.data);
  var postTags = _.keys(tagsByName);
  var initialMarketSize = postAvgMarketSize(post.data);
  var myMarketSizeEstimate = postMarketSizeForUser(post.data, Meteor.userId());
  var postMyTags = postAudienceTagsForUser(post.data, Meteor.userId());

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

  var myTags = function() {
    var tags = _.map(postMyTags, function(tag) {
      return {id: tag, text: tag};
    });
    console.log('myTags', tags);
    // callback(tags);
    return tags;
  };

  var highlightMyTagsCss = function(data, el) {
    if (postMyTags) {
      if (_.contains(postMyTags, data.id)) { return "my-tag"; }
    } else {
      throw "My tags unavailable. Not logged in?";
    }
  };

  $('.tags', $this).
    unbind('save').on('save', function(e, params) {
      var postId = post.data._id,
          tags = params.submitValue;
      Meteor.call('setAudienceTags', postId, tags);
    }).
    unbind('shown').on('shown', function() {
      if (arguments.length == 2) {
        var form = arguments[1].container.$form;
        form.find('.editable-input').prepend("<div class='editable-label'>Red tags are yours.</div>");
        setTimeout(function() {
          form.find('.editable-input ul.select2-choices').click();
        }, 400);
      }
    }).
    editable({
      pk: 1,
      mode: 'popup',
      placement: 'right',
      type: 'select2',
      autotext: 'always',
      emptytext: 'Add Target Audience',
      value: postTags,
      display: tagDisplay,
      showbuttons: 'right',
      onblur: 'ignore',
      select2: {
        formatSelectionCssClass: highlightMyTagsCss,
        tags: allTags,
        multiple: true,
        tokenSeparators: [",", " "],
        // minimumInputLength: 1,
        // openOnEnter: false,
        // closeOnSelect: false
      }
    });

  $('.market-size', $this).unbind('save').on('save', function(e, params) {
    var postId = post.data._id,
        marketSize = parseInt(params.submitValue.
          replace(/k$/i, '000').    // allow k for thousands
          replace(/m$/i, '000000'). // allow m for millions
          replace(/[^0-9\.]/, '')   // filter out other non-numeric digits
        );
    Meteor.call('setMarketSize', postId, marketSize);
  }).editable({
    mode: 'popup',
    placement: 'right',
    type: 'text',
    emptytext: 'Estimate Market Size',
    value: initialMarketSize.toString(),
    display: function(v) {
      if (v && v.length > 0) {
        var msg = 'Est. Market Size: $' + addCommas(v);
        if (myMarketSizeEstimate)
          msg += ' (You: $' + addCommas(myMarketSizeEstimate) + ')';
        else
          msg += ' <span class="editable-empty">(Add Your Estimate)</span>';
        $(this).html(msg);
      } else {
        $(this).empty();
      }
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