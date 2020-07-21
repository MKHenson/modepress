import * as assert from 'assert';
import { IPost, IAdminUser, IDocument } from '../../../../src';
import header from '../../header';
import { generateRandString } from '../../../../src/utils/utils';
import { ADD_POST, REMOVE_POST } from '../../../../src/graphql/client/requests/posts';
import { AddPostInput } from '../../../../src/graphql/models/post-type';
import { GET_DOCUMENT } from '../../../../src/graphql/client/requests/documents';
let lastPost: IPost<'expanded'>, lastPost2: string;

describe('[GQL] Testing creation of posts', function() {
  it('cannot create post when not logged in', async function() {
    const { errors } = await header.guest.graphql<IPost<'expanded'>>(ADD_POST, {
      token: new AddPostInput({
        title: 'New Post',
        slug: 'slug'
      })
    });
    assert.deepEqual(errors![0].message, `Access denied! You don't have permission for this action!`);
  });

  it('cannot create a post as a regular user', async function() {
    const { errors } = await header.user1.graphql<IPost<'expanded'>>(ADD_POST, {
      token: new AddPostInput({
        title: 'New Post',
        slug: 'slug'
      })
    });
    assert.deepEqual(errors![0].message, `Access denied! You don't have permission for this action!`);
  });

  // it('cannot create a post without title', async function() {
  //   const { errors } = await header.admin.graphql<IPost<'expanded'>>(ADD_POST, {
  //     token: new AddPostInput({
  //       title: ''
  //     })
  //   });
  //   assert.deepEqual(errors![0].message, 'title cannot be empty');
  // });

  it('cannot create a post without a slug field', async function() {
    const { errors } = await header.admin.graphql<IPost<'expanded'>>(ADD_POST, {
      token: new AddPostInput({
        title: 'New Post'
      })
    });
    assert.deepEqual(
      errors![0].message,
      'Variable "$token" got invalid value { title: "New Post" }; Field slug of required type String! was not provided.'
    );
  });

  // it('cannot create a post without slug', async function() {
  //   const { errors } = await header.admin.graphql<IPost<'expanded'>>(
  //     `mutation { createPost(token: { title: "test", slug: "" }) { _id } }`
  //   );
  //   assert.deepEqual(errors[0].message, 'slug cannot be empty');
  // });

  it('can create a post with valid data', async function() {
    const slug = generateRandString(10);
    const response = await header.admin.graphql<IPost<'expanded'>>(ADD_POST, {
      token: new AddPostInput({
        title: 'Simple Test',
        slug: slug,
        brief: 'This is brief',
        public: false,
        tags: ['super-tags-1234', 'supert-tags-4321']
      })
    });

    const post = response.data;

    // (
    //   `mutation { createPost(token: {
    //     title: "Simple Test",
    //     slug: "${slug}",
    //     brief: "This is brief",
    //     public: false,
    //     categories: ["super-tests"],
    //     tags: ["super-tags-1234", "supert-tags-4321"]
    //   }) {
    //     ...PostFields,
    //     latestDraft { _id }
    //     author { username },
    //     featuredImage { _id },
    //     document {
    //       _id
    //       createdOn
    //       elementsOrder
    //       elements { _id, html, type, parent { _id } }
    //       author { username },
    //       template { name }
    //     }
    //   } } ${postFragment}`
    // );

    lastPost = post;
    assert.strictEqual(post.public, false);
    assert.strictEqual(post.author!.username, (header.config.adminUser as IAdminUser).username);
    assert.strictEqual(post.brief, 'This is brief');
    assert.strictEqual(post.slug, slug);
    assert.strictEqual(post.title, 'Simple Test');
    assert.strictEqual(post.featuredImage, null);
    assert(post.categories.length === 0);
    assert.strictEqual(post.categories.length, 0);
    assert(post.tags.length === 2);
    assert.strictEqual(post.tags[0], 'super-tags-1234');
    assert.strictEqual(post.tags[1], 'supert-tags-4321');
    assert(post._id);
    assert(post.createdOn > 0);
    assert(post.lastUpdated > 0);

    // Check the default doc is created
    const doc = post.document;
    assert.deepEqual(doc.template.name, 'Simple Post');
    assert.deepEqual(doc.author.username, (header.config.adminUser as IAdminUser).username);
    assert(doc.createdOn > 0);

    // Check the elements & draft
    assert.deepEqual(doc.elements.length, 1);
    assert.deepEqual(doc.elements[0].html, '<p></p>');
    assert.deepEqual(doc.elements[0].parent, doc._id);
    assert.deepEqual(doc.elements[0].type, 'paragraph');
    assert(Array.isArray(doc.elementsOrder));
    assert.deepEqual(doc.elementsOrder[0], doc.elements[0]._id);
    assert.deepEqual(post.latestDraft, null);
  });

  it('can get the document associated with the post', async function() {
    const {
      data: { _id }
    } = await header.admin.graphql<IDocument<'expanded'>>(GET_DOCUMENT, { id: lastPost.document._id });
    assert(_id);
  });

  it('should create a post & strip HTML from title', async function() {
    const { data: post } = await header.admin.graphql<IPost<'expanded'>>(
      ADD_POST,
      {
        token: new AddPostInput({
          title: 'Simple Test <h2>NO</h2>',
          slug: generateRandString(10),
          brief: 'This is brief'
        })
      }
      // `mutation { createPost(token: {
      //   title: "Simple Test <h2>NO</h2>",
      //   slug: "${generateRandString(10)}",
      //   brief: "This is brief"
      // }) { title, _id } }`
    );

    assert.strictEqual(post.title, 'Simple Test NO');
    lastPost2 = post._id;
  });

  it('did delete the posts', async function() {
    const { data: firstDelted } = await header.admin.graphql<boolean>(REMOVE_POST, { id: lastPost._id });
    const { data: secondDelted } = await header.admin.graphql<boolean>(REMOVE_POST, { id: lastPost2 });

    assert(firstDelted);
    assert(secondDelted);
  });
});
