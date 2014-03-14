Posts = new Meteor.Collection('posts');

Posts.allow({
  update: loggedIn,
  remove: ownsDocument
});

// Posts.deny({
//   update: function(userId, post, fieldNames) {
//     // may only edit the following fields:
//     return (_.without(fieldNames, 'title', 'description').length > 0);
//   }
// });

postTagsByName = function(post) {
  var tagsByName = {};
  if (post.perspectives) {
    for (i = 0; i < post.perspectives.length; i++) {
      var perspective = post.perspectives[i];
      if (perspective.audienceTags) {
        for (j = 0; j < perspective.audienceTags.length; j++) {
          var tag = perspective.audienceTags[j];
          if (tagsByName[tag]) {
            tagsByName[tag].weight++;
          } else {
            tagsByName[tag] = {name: tag, weight: 1};
          }
        }
      }
    }
  }
  return tagsByName;
};

// Helper function for filtering perspectives with 'marketSize' key
var hasMarketSize = function(perspective) {
  return _.isNumber(perspective.marketSize) &&
        !_.isNaN(perspective.marketSize);
};

// Helper function to find the current user's perspective
var fromPerspective = function(userId) {
  return function(perspective) {
    return perspective.userId == userId;
  };
}

postMarketSizeEstimates = function(post) {
  if (post.perspectives) {
    return _.chain(post.perspectives).
      filter(hasMarketSize).
      map(function(p) {
        return parseInt(p.marketSize);
      }).
      value();
  } else {
    return [];
  }
}

postAvgMarketSize = function(post) {
  var estimates = postMarketSizeEstimates(post);
  Meteor._debug('estimates', estimates);
  if (estimates.length > 0) {
    var sum = _.reduce(estimates, function(memo, num){ return memo + num; }, 0);
    return parseFloat(sum) / estimates.length;
  } else {
    return "";
  }
};

postMyMarketSize = function(post, userId) {
  if (post.perspectives) {
    var myPerspective = _.chain(post.perspectives).
      filter(fromPerspective(userId)).
      first().
      value();
    if (myPerspective)
      return myPerspective.marketSize;
    else
      return 0;
  } else {
    return 0;
  }
};

var updatePerspectiveKey = function(postId, key, value) {

  var setDoc = {};
  setDoc['perspectives.$.' + key] = value;

  var updated = Posts.update(
    { _id: postId, 'perspectives.userId': Meteor.userId() },
    { $set: setDoc }
  );

  if (updated == 0) {
    var doc = { userId: Meteor.userId() };
    doc[key] = value;
    Posts.update(
      { _id: postId },
      { $push: { perspectives: doc } }
    );
  }

};

Meteor.methods({
  post: function(postAttributes) {
    var user = Meteor.user();
    
    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to login to create new business cases");
    
    // ensure the post has a title
    if (!postAttributes.title)
      throw new Meteor.Error(422, "Please fill in a title");
        
    // pick out the whitelisted keys
    var post = _.extend(_.pick(postAttributes, 'title', 'description'), {
      userId: user._id,
      author: user.username,
      submitted: new Date().getTime(),
      commentsCount: 0,
      votes: 0,
      upvoters: [],
      perspectives: []
    });
    
    var postId = Posts.insert(post);
    
    return postId;
  },

  setAudienceTags: function(postId, tags) {
    updatePerspectiveKey(postId, 'audienceTags', tags);
  },

  setMarketSize: function(postId, marketSize) {
    updatePerspectiveKey(postId, 'marketSize', marketSize);
  },

  // Sets the "perspective" sub-document of a post, for the current user
  // TODO: it would be nice if we could do this atomically...
  setPerspective: function(postId, perspective) {
    var user = Meteor.user();

    Posts.update(
      { _id: postId },
      { $pull: {perspectives: {userId: user._id}} }
    );

    // Make sure to include the user's ID if it isn't there yet
    perspective = _.extend({}, perspective, {userId: user._id});

    Posts.update(
      // Find perspective matching this user's ID
      { _id: postId },
      // Add the perspective
      { $push: { perspectives: perspective } }
    );
  },
  
  upvote: function(postId) {
    var user = Meteor.user();
    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to login to upvote");
    
    Posts.update({
      _id: postId, 
      upvoters: {$ne: user._id}
    }, {
      $addToSet: {upvoters: user._id},
      $inc: {votes: 1}
    });
  },

  unupvote: function(postId) {
    var user = Meteor.user();
    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to login to vote");
    
    Posts.update({
      _id: postId, 
      upvoters: user._id
    }, {
      $pull: {upvoters: user._id},
      $inc: {votes: -1}
    });
  }

});