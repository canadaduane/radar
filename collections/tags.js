Tags = new Meteor.Collection('tags');

var upsertTagsForPost = function(userId, doc) {
  var tagsByName = postTagsByName(doc);
  var tags = _.keys(tagsByName);
  Meteor.call('addTags', tags, 'audience');
};

Posts.before.insert(upsertTagsForPost);
Posts.before.update(upsertTagsForPost);

Meteor.methods({
  addTags: function(tags, category) {
    _.each(tags, function(tag) {
      var tagDoc = {name: tag, category: category};
      var id = Tags.upsert(tagDoc, tagDoc);
      // Meteor._debug('upserted tag', id, tagDoc);
    });    
  }
})