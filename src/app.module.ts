import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { FileModule } from './file/file.module';
import { OrderModule } from './order/order.module';
import { StatisticsModule } from './statistics/statistics.module';
import { ProductModule } from './product/product.module';

@Module({
	imports: [ConfigModule.forRoot(), AuthModule, UserModule, CategoryModule, FileModule, OrderModule, StatisticsModule, ProductModule],
})
export class AppModule {}
