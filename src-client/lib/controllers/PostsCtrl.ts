﻿module clientAdmin
{
	/**
	* Controller for the dashboard posts section
	*/
    export class PostsCtrl extends PagedContentCtrl
    {
        public postToken: modepress.IPost;
        public posts: Array<modepress.IPost>;
        public showNewPostForm: boolean;
        public editMode: boolean;
        public apiURL: string;
        public scope: any;
        public successMessage: string;
        public tagString: string;
        public newCategoryMode: boolean;
        public showCategoryDelete: boolean;
        public categories: Array<modepress.ICategory>;
        public categoryToken: modepress.ICategory;
        public searchKeyword: string;
        public searchCategory: string;
        public sortOrder: string;
        public sortType: string;
        public showFilters: boolean;

		// $inject annotation.
        public static $inject = ["$scope", "$http", "apiURL", "categories"];
        constructor(scope, http: ng.IHttpService, apiURL: string, categories: Array<modepress.ICategory>)
        {
            super(http);
            this.newCategoryMode = false;
            this.scope = scope;
            this.apiURL = apiURL;
            this.posts = [];
            this.successMessage = "";
            this.tagString = "";
            this.showNewPostForm = false;
            this.showCategoryDelete = false;
            this.editMode = false;
            this.showFilters = false;
            this.searchKeyword = "";
            this.searchCategory = "";
            this.sortOrder = "desc";
            this.sortType = "created";

            this.postToken = { title: "", content: "", slug: "", tags: [], categories: [] };
            this.getPosts();
            tinymce.init({
                height: 350,
                selector: "textarea", plugins: ["media", "image", "link", "code", "textcolor", "colorpicker", "table", "wordcount", "lists", "contextmenu"],
                toolbar1: "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | print preview media | forecolor backcolor emoticons"
            });

            // The category token
            this.categoryToken = { title: "", description: "", slug: "" };

            // Fetches the categories
            this.categories = categories;
        }

        swapOrder()
        {
            this.sortOrder = (this.sortOrder == 'asc' ? 'desc' : 'asc');
            this.getPosts();
        }

        swapSortType()
        {
            this.sortType = (this.sortType == 'created' ? 'updated' : 'created');
            this.getPosts();
        }

        /**
        * Gets a list of categories
        */
        getCategories()
        {
            var that = this;
            that.http.get<modepress.IGetCategories>(`${that.apiURL}/posts/get-categories`).then(function (categories)
            {
                that.categories = categories.data.data;
            });
        }

        /**
        * Sets the page into post mode
        */
        newPostMode()
        {
            this.scope.newPostForm.$setUntouched();
            this.scope.newPostForm.$setPristine();
            this.postToken = { title: "", content: "", slug: "", tags: [], categories: [] };
            this.editMode = false;
            this.successMessage = "";
            tinymce.editors[0].setContent("");
            this.showNewPostForm = !this.showNewPostForm
        }

        /**
        * Sets the page into edit mode
        */
        editPostMode(post: modepress.IPost)
        {
            this.postToken = post;
            this.successMessage = "";
            tinymce.editors[0].setContent(post.content);
            this.editMode = true;
            this.showNewPostForm = !this.showNewPostForm
        }

        /**
		* Sets the page search back to index = 0
		*/
        goFirst()
        {
            super.goFirst();
            this.getPosts();
        }

        /**
		* Gets the last set of users
		*/
        goLast()
        {
            super.goLast();
            this.getPosts();
        }

        /**
        * Sets the page search back to index = 0
        */
        goNext()
        {
            super.goNext();
            this.getPosts();
        }

        /**
        * Sets the page search back to index = 0
        */
        goPrev()
        {
            super.goPrev();
            this.getPosts();
        }

        /**
		* Fetches the posts from the database
		*/
        getPosts()
        {
            var that = this;
            this.error = false;
            this.errorMsg = "";
            this.loading = true;
            var index = this.index;
            var limit = this.limit;
            var keyword = this.searchKeyword;
            var searchCategory = this.searchCategory;
            var order = this.sortOrder;
            var sortType = this.sortType;

            that.http.get<modepress.IGetPosts>(`${that.apiURL}/posts/get-posts?verbose=true&sort=${sortType}&sortOrder=${order}&categories=${searchCategory}&index=${index}&limit=${limit}&keyword=${keyword}`).then(function (token)
            {
                if (token.data.error) {
                    that.error = true;
                    that.errorMsg = token.data.message;
                    that.posts = [];
                    that.last = Infinity;
                }
                else {
                    that.posts = token.data.data;
                    that.last = token.data.count;
                }
               
                that.loading = false;
            });
        }

        /**
		* Processes the tags in a post array of keywords
		*/
        processTags()
        {
            var newTags = this.tagString.split(",");

            for (var i = 0, l = newTags.length; i < l; i++)
            {
                var newTag = newTags[i].trim();
                if (newTag != "" && this.postToken.tags.indexOf(newTag) == -1)
                    this.postToken.tags.push(newTag);
            }
            
            this.scope.tagForm.$setUntouched();
            this.scope.tagForm.$setPristine();

            this.tagString = "";
        }

        /**
		* Removes a tag from the post array
		*/
        removeTag(tag : string)
        {
            this.postToken.tags.splice(this.postToken.tags.indexOf(tag), 1);
        }

        /**
        * Removes a user from the database
        * @param {UsersInterface.IUserEntry} user The user to remove
        */
        removePost(post: modepress.IPost)
        {
            var that = this;
            this.error = false;
            this.errorMsg = "";
            this.loading = true;

            that.http.delete<modepress.IResponse>(`${that.apiURL}/posts/remove-post/${post._id}`).then(function (token)
            {
                if (token.data.error) {
                    that.error = true;
                    that.errorMsg = token.data.message;
                }
                else
                    that.posts.splice(that.posts.indexOf(post), 1);

                that.loading = false;
                (<any>post).confirmDelete = false;
            });
        }       

        /**
        * Removes a category from the database by ID
        * @param {modepress.ICategory} category The category to remove
        */
        removeCategory(category: modepress.ICategory)
        {
            var that = this;
            this.error = false;
            this.errorMsg = "";
            this.loading = true;

            that.http.delete<modepress.IResponse>(`${that.apiURL}/posts/remove-category/${category._id}`).then(function (token)
            {
                if (token.data.error)
                {
                    that.error = true;
                    that.errorMsg = token.data.message;
                }
                else
                {
                    if (that.postToken.categories.indexOf(category.slug) != -1)
                        that.postToken.categories.splice(that.postToken.categories.indexOf(category.slug), 1);

                    that.categories.splice(that.categories.indexOf(category), 1);
                }

                that.loading = false;
            });
        }   

        /**
        * Creates a new user 
        */
        createPost()
        {
            this.scope.newPostForm.$setSubmitted();

            if (this.scope.newPostForm.$valid == false)
                return;

            var that = this;
            this.error = false;
            this.errorMsg = "";
            this.loading = true;
            var postToken = this.postToken;
            postToken.content = tinymce.editors[0].getContent();

            if (this.editMode)
            {
                that.http.put<modepress.IGetPost>(`${that.apiURL}/posts/update-post/${postToken._id}`, postToken).then(function (token)
                {
                    if (token.data.error)
                    {
                        that.error = true;
                        that.errorMsg = token.data.message;
                    }
                    else
                    {
                        that.successMessage = token.data.message;
                        postToken.lastUpdated = Date.now();
                    }

                    that.loading = false;
                });
            }
            else
            {
                that.http.post<modepress.IGetPost>(`${that.apiURL}/posts/create-post`, postToken).then(function (token)
                {
                    if (token.data.error)
                    {
                        that.error = true;
                        that.errorMsg = token.data.message;
                    }
                    else
                    {
                        that.posts.push(token.data.data);
                        that.showNewPostForm = false;
                    }

                    that.loading = false;
                });
            }
        }

        /**
        * Creates a new category 
        */
        createCategory()
        {
            this.scope.newCategoryForm.$setSubmitted();

            if (this.scope.newCategoryForm.$valid == false)
                return;

            var that = this;
            this.error = false;
            this.errorMsg = "";
            this.loading = true;
            var categoryToken = this.categoryToken;
            that.http.post<modepress.IGetCategory>(`${that.apiURL}/posts/create-category`, categoryToken).then(function (token)
            {
                if (token.data.error)
                {
                    that.error = true;
                    that.errorMsg = token.data.message;
                }
                else
                {
                    that.categories.push(token.data.data);
                    that.categoryToken.description = "";
                    that.categoryToken.title = "";
                    that.categoryToken.slug = "";
                }

                that.loading = false;

                that.scope.newCategoryForm.$setUntouched();
                that.scope.newCategoryForm.$setPristine();
            });
        }

        /**
        * Adds this category to the post's selected categories
        */
        selectCategory(category: modepress.ICategory)
        {
            if (this.postToken.categories.indexOf(category.slug) == -1)
                this.postToken.categories.push(category.slug);
            else
                this.postToken.categories.splice(this.postToken.categories.indexOf(category.slug), 1);
        }
	}
}