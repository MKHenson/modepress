const test = require( 'unit.js' );
let guest, admin, config,
    testUserName = 'fancyUser123',
    testUserEmail = 'fancyUser123@fancy.com';

describe( 'Testing registering a user', function() {

    before( function() {
        const header = require( '../header.js' );
        guest = header.users.guest;
        admin = header.users.admin;
        config = header.config;
    } )

    it( `did remove any existing user called ${testUserName}`, function( done ) {
        admin.delete( `/users/${testUserName}` )
            .then( res => {
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'should not register with blank credentials', function( done ) {
        admin.post( `/auth/register`, { username: "", password: "" } )
            .then( res => {
                test.bool( res.body.error ).isTrue()
                test.object( res.body ).hasProperty( "message" )
                test.string( res.body.message ).is( "Please enter a valid username" )
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'should not register with existing username', function( done ) {
        admin.post( `/auth/register`, { username: admin.username, password: "FakePass" } )
            .then( res => {
                test.bool( res.body.error ).isTrue()
                test.object( res.body ).hasProperty( "message" )
                test.string( res.body.message ).is( "That username or email is already in use; please choose another or login." )
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'should not register with blank username', function( done ) {
        admin.post( `/auth/register`, { username: "", password: "FakePass" } )
            .then( res => {
                test.bool( res.body.error ).isTrue()
                test.object( res.body ).hasProperty( "message" )
                test.string( res.body.message ).is( "Please enter a valid username" )
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'should not register with blank password', function( done ) {
        admin.post( `/auth/register`, { username: "sdfsdsdfsdfdf", password: "" } )
            .then( res => {
                test.bool( res.body.error ).isTrue()
                test.object( res.body ).hasProperty( "message" )
                test.string( res.body.message ).is( "Password cannot be null or empty" )
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'should not register with bad characters', function( done ) {
        admin.post( `/auth/register`, { username: "!\"�$%^^&&*()-=~#}{}", password: "!\"./<>;�$$%^&*()_+" } )
            .then( res => {
                test.bool( res.body.error ).isTrue()
                test.object( res.body ).hasProperty( "message" )
                test.string( res.body.message ).is( "Please only use alpha numeric characters for your username" )
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'should not register with valid information but no email', function( done ) {
        admin.post( `/auth/register`, { username: testUserName, password: "Password" } )
            .then( res => {
                test.bool( res.body.error ).isTrue()
                test.object( res.body ).hasProperty( "message" )
                test.string( res.body.message ).is( "Email cannot be null or empty" )
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'should not register with valid information but invalid email', function( done ) {
        admin.post( `/auth/register`, { username: testUserName, password: "Password", email: "bad_email" } )
            .then( res => {
                test.bool( res.body.error ).isTrue()
                test.object( res.body ).hasProperty( "message" )
                test.string( res.body.message ).is( "Please use a valid email address" )
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'should register with valid information', function( done ) {
        guest.post( `/auth/register`, { username: testUserName, password: "Password", email: testUserEmail } )
            .then( res => {
                test.bool( res.body.error ).isFalse()
                test.string( res.body.message ).is( "Please activate your account with the link sent to your email address" )
                test.object( res.body.user )
                done();
            } ).catch( err => done( err ) );
    } )

    it( `did create an activation key for ${testUserName}`, function( done ) {
        admin.get( `/users/${testUserName}?verbose=true` )
            .then( res => {
                test.object( res.body.data ).hasProperty( "registerKey" )
                test.string( res.body.data.registerKey ).isNot( "" );
                done();
            } ).catch( err => done( err ) );
    } )

    it( `did allow an admin to activate ${testUserName}`, function( done ) {
        admin.put( `/auth/${testUserName}/approve-activation` )
            .then( res => {
                test.bool( res.body.error ).isFalse()
                done();
            } ).catch( err => done( err ) );
    } )

    it( `did approve ${testUserName}'s register key`, function( done ) {
        admin.get( `/users/${testUserName}?verbose=true` )
            .then( res => {
                test.object( res.body.data ).hasProperty( "registerKey" )
                test.string( res.body.data.registerKey ).is( "" );
                done();
            } ).catch( err => done( err ) );
    } )

    it( 'did cleanup the registered user', function( done ) {
        admin.delete( `/users/${testUserName}` )
            .then( res => {
                test.string( res.body.message ).is( `User ${testUserName} has been removed` )
                done();
            } ).catch( err => done( err ) );
    } )
} )