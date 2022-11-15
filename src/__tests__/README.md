# Tests

Please place your tests in this folder.

// saving this for unit testing in the future
import {JWTService} from '@loopback/authentication-jwt';
import {
createStubInstance,
StubbedInstanceWithSinonAccessor,
} from '@loopback/testlab';
import {UserController} from '../../controllers';
import {MovieRepository, UserRepository} from '../../repositories';
import {FileUploadProvider} from '../../services/upload.service';
import {CustomUserService} from '../../services/user.service';

describe('UserController (unit)', () => {
let repo: StubbedInstanceWithSinonAccessor<UserRepository>;
let movieRepo: StubbedInstanceWithSinonAccessor<MovieRepository>;
let jwtService: StubbedInstanceWithSinonAccessor<JWTService>;
let userService: StubbedInstanceWithSinonAccessor<CustomUserService>;
let fileUploadProvider: StubbedInstanceWithSinonAccessor<FileUploadProvider>;

before(() => {
repo = createStubInstance(UserRepository);
movieRepo = createStubInstance(MovieRepository);
jwtService = createStubInstance(JWTService);
userService = createStubInstance(CustomUserService);
fileUploadProvider = createStubInstance(FileUploadProvider);
});

describe('login', () => {
it('checks if a user with the given email exists', async () => {
const controller = new UserController(
fileUploadProvider.value(),
jwtService,
userService,
repo,
movieRepo,
);

      const details = await controller.login({
        email: '',
        password: '',
      });
    });

});
});
