import { Module } from '@nestjs/common'
import { ReviewService } from './review.service'
import { ReviewController } from './review.controller'
import { PrismaService } from 'src/prisma.service'
import { ProductService } from 'src/product/product.service'

@Module({
	controllers: [ReviewController],
	providers: [ReviewService, PrismaService, ProductService],
})
export class ReviewModule {}
