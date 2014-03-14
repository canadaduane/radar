Tags = new Meteor.Collection('tags');

var upsertTagsForPost = function(userId, doc) {
  var tagsByName = postTagsByName(doc);
  var tags = _.keys(tagsByName);

  _.each(tags, function(tag) {
    var tagDoc = {name: tag, category: 'audience'};
    var id = Tags.upsert(tagDoc, tagDoc);
    // Meteor._debug('upserted tag', id, tagDoc);
  });
};

Posts.before.insert(upsertTagsForPost);
Posts.before.update(upsertTagsForPost);
