import {
  JWTService,
  UserCredentialsRepository,
} from '@loopback/authentication-jwt';
import {securityId, UserProfile} from '@loopback/security';
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
  stubExpressContext,
} from '@loopback/testlab';
import bcryptjs from 'bcryptjs';
import FormData from 'form-data';
import {randomPassword} from 'secure-random-password';
import {UserController} from '../../controllers';
import {BaseController} from '../../controllers/base.controller';
import {User, UserCredential} from '../../models';
import {MovieRepository, UserRepository} from '../../repositories';
import {FileUploadProvider} from '../../services/upload.service';
import {CustomUserService} from '../../services/user.service';

describe('UserController (unit)', () => {
  let repo: StubbedInstanceWithSinonAccessor<UserRepository>;
  let movieRepo: StubbedInstanceWithSinonAccessor<MovieRepository>;
  let credsRepo: StubbedInstanceWithSinonAccessor<UserCredentialsRepository>;
  let jwtService: StubbedInstanceWithSinonAccessor<JWTService>;
  let userService: StubbedInstanceWithSinonAccessor<CustomUserService>;
  let fileUploadProvider: StubbedInstanceWithSinonAccessor<FileUploadProvider>;

  let hashStub: sinon.SinonStub;
  let genSaltStub: sinon.SinonStub;
  let parseUploadBodyStub: sinon.SinonStub;

  let controller: UserController;

  let adminUser: User;
  let regularUser: User;
  let credential: UserCredential;
  let regularProfile: UserProfile;

  before(init);

  describe('login', () => {
    it('valid credentials', async () => {
      const verifyCredentials = userService.stubs.verifyCredentials;
      const convertToUserProfile = userService.stubs.convertToUserProfile;
      const generateToken = jwtService.stubs.generateToken;

      verifyCredentials.resolves(regularUser);
      convertToUserProfile.resolves(regularProfile);
      generateToken.resolves('token');

      const credentials = {
        email: adminUser.email,
        password: credential.password,
      };

      const {message, data, success} = await controller.login(credentials);

      expect(message).to.equal('Successfully logged in');
      expect(success).to.equal(true);
      expect(data).to.have.property('token');
      expect(data).to.have.property('user');

      sinon.assert.calledWith(verifyCredentials, credentials);
      sinon.assert.calledWith(convertToUserProfile, regularUser);
      sinon.assert.called(generateToken);
    });

    it('invalid credentials', async () => {
      const verifyCredentials = userService.stubs.verifyCredentials;
      verifyCredentials.rejects(new Error('Invalid email or password.'));

      const credentials = {
        email: 'random@email.com',
        password: credential.password,
      };

      const {message, data, success} = await controller.login(credentials);

      expect(message).to.equal('Invalid email or password.');
      expect(success).to.equal(false);
      expect(data).to.be.null();

      sinon.assert.calledWith(verifyCredentials, credentials);
    });

    it('user account with pending approval', async () => {
      const verifyCredentials = userService.stubs.verifyCredentials;
      verifyCredentials.rejects(new Error('User activation is still pending.'));

      const credentials = {
        email: 'random@email.com',
        password: credential.password,
      };

      const {message, data, success} = await controller.login(credentials);

      expect(message).to.equal('User activation is still pending.');
      expect(success).to.equal(false);
      expect(data).to.be.null();

      sinon.assert.calledWith(verifyCredentials, credentials);
    });
  });

  describe('register', () => {
    it('registers a user', async () => {
      const data = new FormData();
      repo.stubs.create.resolves(regularUser);
      credsRepo.stubs.create.resolves(credential);

      const jsonUser: {[key: string]: any} = regularUser.toJSON();
      for (const key in jsonUser) {
        if (key === 'id') continue;
        data.append(key, jsonUser[key]);
      }

      const {request, response} = stubExpressContext({
        url: '/users',
        payload: data,
        method: 'POST',
      });

      const result = await controller.signUp(request, response);

      expect(result.success).to.be.true();
      expect(result.message).to.equal('Registration successful!');
      expect(result.data).to.containDeep(regularUser);

      sinon.assert.called(parseUploadBodyStub);
      sinon.assert.called(hashStub);
      sinon.assert.called(genSaltStub);
    });

    it('updates a user', async () => {
      const data = new FormData();
      repo.stubs.findById.resolves(regularUser);

      const jsonUser: {[key: string]: any} = regularUser.toJSON();
      for (const key in jsonUser) {
        if (key === 'id') continue;
        data.append(key, jsonUser[key]);
      }

      const {request, response} = stubExpressContext({
        url: '/users',
        payload: data,
        method: 'PATCH',
      });

      const result = await controller.updateUser(request, '1', response);

      expect(result.success).to.be.true();
      expect(result.message).to.equal('User updated successfully!');

      sinon.assert.called(parseUploadBodyStub);
      sinon.assert.called(hashStub);
      sinon.assert.called(genSaltStub);
    });
  });

  function init() {
    adminUser = new User({
      id: '1',
      fullname: 'Administrator',
      email: 'admin@email.com',
      role: 'ADMIN',
      approved: true,
    });

    regularUser = new User({
      id: '1',
      fullname: 'Regular User',
      email: 'user@email.com',
      role: 'USER',
      approved: true,
    });

    regularProfile = {
      [securityId]: regularUser.id,
      ...regularUser.toJSON(),
    };

    credential = new UserCredential({
      id: '1',
      password: randomPassword(),
      userId: '1',
    });

    genSaltStub = sinon.stub(bcryptjs, 'genSalt').resolves('salt');
    hashStub = sinon.stub(bcryptjs, 'hash').resolves('hash');
    parseUploadBodyStub = sinon.stub(BaseController, 'parseUploadBody');
    parseUploadBodyStub.callsFake(async () => {
      return {
        files: [{publicUrl: '', filename: '', fieldname: '', filepath: ''}],
        fields: {},
      };
    });

    repo = createStubInstance(UserRepository);
    credsRepo = createStubInstance(UserCredentialsRepository);
    movieRepo = createStubInstance(MovieRepository);
    jwtService = createStubInstance(JWTService);
    userService = createStubInstance(CustomUserService);
    fileUploadProvider = createStubInstance(FileUploadProvider);
    controller = new UserController(
      fileUploadProvider.value(),
      jwtService,
      userService,
      repo,
      movieRepo,
      credsRepo,
    );
  }
});
