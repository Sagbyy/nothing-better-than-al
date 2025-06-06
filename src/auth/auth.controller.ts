import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({
    description: 'User registered successfully',
    schema: {
      example: {
        id: '7a8b4f12-8b94-404a-b869-98017db386bf',
        email: 'email@example.com',
        password:
          '$2b$10$xS0igdeBBTUNk3X5w8wOFuC5/QDY1uso1yGwHQ.8yPj0yKbTjDXt6',
        role: 'CLIENT',
        createdAt: '2025-05-03T21:32:21.505Z',
        updatedAt: '2025-05-03T21:32:21.505Z',
      },
    },
  })
  @ApiOperation({
    summary: 'Register a new user',
    description: 'This endpoint registers a new user.',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({
    description: 'User logged in successfully',
    type: LoginResponseDto,
  })
  @ApiOperation({
    summary: 'Login user',
    description: 'This endpoint logs in a user and returns tokens.',
  })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('refresh')
  @ApiCreatedResponse({
    description: 'Refresh token',
    type: LoginResponseDto,
  })
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'This endpoint refreshes the access token using the refresh token.',
  })
  async refresh(@Body('refreshToken') token: string) {
    return this.authService.refresh(token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({
    description: 'User logged out successfully',
    schema: {
      example: {
        message: 'User logged out successfully',
      },
    },
  })
  @ApiOperation({
    summary: 'Logout user',
    description: 'This endpoint logs out a user.',
  })
  async logout(@Request() req: Request & { user: JwtPayload }) {
    this.logger.log('Logout user', req.user);
    return this.authService.logout(req.user.sub);
  }
}
