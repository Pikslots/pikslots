import {
  err,
  InfrastructureError,
  ok,
  Result,
  Slot,
  User,
  UserAlreadyExistsError,
  ShedulingWindow,
  UserBreak,
  UserNotFoundError,
  UserRepository,
  UserRole,
  WeekDay,
} from '@pikslots/domain';
import { USER_TEST_DATA } from './user.test.data';

export class UserRepositoryTestImpl implements UserRepository {
  async save(
    user: User,
  ): Promise<Result<void, UserAlreadyExistsError | InfrastructureError>> {
    try {
      await Promise.resolve('');

      if (USER_TEST_DATA.filter((item) => item.id === user.id)[0]) {
        return err<UserAlreadyExistsError>({
          kind: 'user_already_exists',
          message: `A user with this ${user.id} already exists`,
          timestamp: new Date(),
          field: 'email',
        });
      }

      USER_TEST_DATA.push(user);
      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save user',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findById(
    id: string,
  ): Promise<Result<User | null, UserNotFoundError | InfrastructureError>> {
    await Promise.resolve('');

    const userFound = USER_TEST_DATA.filter((item) => item.id === id)[0];

    if (!userFound) return ok(null);

    return ok(userFound);
  }
  async findByEmail(
    email: string,
  ): Promise<Result<User | null, UserNotFoundError | InfrastructureError>> {
    await Promise.resolve('');
    const user = USER_TEST_DATA.find((item) => item.email === email) ?? null;
    return ok(user);
  }

  async findAllByBusiness(
    businessId: string,
  ): Promise<Result<User[], InfrastructureError>> {
    await Promise.resolve('');
    return ok(USER_TEST_DATA.filter((item) => item.businessId === businessId));
  }

  async findAllByIds(
    ids: string[],
  ): Promise<Result<User[], InfrastructureError>> {
    await Promise.resolve('');
    return ok(USER_TEST_DATA.filter((item) => ids.includes(item.id)));
  }

  async findByUsername(
    username: string,
  ): Promise<Result<User | null, UserNotFoundError | InfrastructureError>> {
    await Promise.resolve('');
    const user =
      USER_TEST_DATA.find((item) => item.username === username) ?? null;
    return ok(user);
  }

  async findAllByRole(
    role: UserRole,
  ): Promise<Result<User[], InfrastructureError>> {
    await Promise.resolve('');
    return ok(USER_TEST_DATA.filter((item) => item.role === role));
  }

  async update(
    user: User,
  ): Promise<Result<void, UserNotFoundError | InfrastructureError>> {
    await Promise.resolve('');
    const index = USER_TEST_DATA.findIndex((item) => item.id === user.id);
    if (index === -1) {
      return err<UserNotFoundError>({
        kind: 'user_not_found',
        message: `User not found against ${user.id}`,
        by: 'id',
        value: user.id,
        timestamp: new Date(),
      });
    }
    USER_TEST_DATA[index] = user;
    return ok(undefined);
  }

  async existsByEmail(
    email: string,
  ): Promise<Result<boolean, InfrastructureError>> {
    await Promise.resolve('');
    return ok(USER_TEST_DATA.some((item) => item.email === email));
  }

  async existsByUsername(
    username: string,
  ): Promise<Result<boolean, InfrastructureError>> {
    await Promise.resolve('');
    return ok(USER_TEST_DATA.some((item) => item.username === username));
  }

  async findBookedSlotsForUser(
    _userId: string,
    _businessId: string,
    _date: string,
  ): Promise<Result<Slot[], InfrastructureError>> {
    await Promise.resolve('');
    return ok([]);
  }

  async findUserBreaks(
    _userId: string,
    _busniessId: string,
    _day: WeekDay,
  ): Promise<Result<UserBreak[], InfrastructureError>> {
    await Promise.resolve('');
    return ok([]);
  }

  async findUserTimeoffsByDate(
    _userId: string,
    _businessId: string,
    _startDate: string,
  ): Promise<
    Result<
      {
        title: string;
        startDateTime: string;
        endDateTime: string;
        allDay: boolean;
        timeZone: string;
      }[],
      InfrastructureError
    >
  > {
    await Promise.resolve('');
    return ok([]);
  }

  async findShedulingWindow(
    _businessId: string,
  ): Promise<Result<ShedulingWindow, InfrastructureError>> {
    await Promise.resolve('');
    return ok({ unit: 'days', value: 30 });
  }

  async findUserTimeoffsWithinShedulingWindow(
    _userId: string,
    _businessId: string,
    _timezone: string,
  ): Promise<
    Result<
      {
        title: string;
        startDateTime: string;
        endDateTime: string;
        allDay: boolean;
        timeZone: string;
      }[],
      InfrastructureError
    >
  > {
    await Promise.resolve('');
    return ok([]);
  }
}
