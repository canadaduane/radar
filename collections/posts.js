Posts = new Meteor.Collection('posts');

Posts.allow({
  update: ownsDocument,
  remove: ownsDocument
});

Posts.deny({
  update: function(userId, post, fieldNames) {
    // may only edit the following fields:
    return (_.without(fieldNames, 'title', 'message', 'audience').length > 0);
  }
});

var upsertTagsForPost = function(userId, doc) {
  if (_.isArray(doc.audience))
    tags = doc.audience;
  else
    tags = [doc.audience];

  _.each(tags, function(tag) {
    var tagDoc = {name: tag, category: 'audience'};
    var id = Tags.upsert(tagDoc, tagDoc);
    // Meteor._debug('upserted tag', id, tagDoc);
  });
};

Posts.before.insert(upsertTagsForPost);
Posts.before.update(upsertTagsForPost);

Meteor.methods({
  post: function(postAttributes) {
    var user = Meteor.user(),
      postWithSameLink = Posts.findOne({url: postAttributes.url});
    
    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to login to create new business cases");
    
    // ensure the post has a title
    if (!postAttributes.title)
      throw new Meteor.Error(422, "Please fill in a title");
    
    // check that there are no previous posts with the same link
    // if (postAttributes.url && postWithSameLink) {
    //   throw new Meteor.Error(302, 
    //     'This link has already been posted', 
    //     postWithSameLink._id);
    // }
    
    // pick out the whitelisted keys
    var post = _.extend(_.pick(postAttributes, 'title', 'message', 'audience'), {
      userId: user._id, 
      author: user.username, 
      submitted: new Date().getTime(),
      commentsCount: 0,
      upvoters: [], votes: 0
    });
    
    var postId = Posts.insert(post);
    
    return postId;
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