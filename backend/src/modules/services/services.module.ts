import { Module } from "@nestjs/common";
import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";
import { ServiceCategoriesController } from "./service-categories.controller";
import { ServiceCategoriesService } from "./service-categories.service";

@Module({
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [ServicesService, ServiceCategoriesService],
  exports: [ServicesService, ServiceCategoriesService],
})
export class ServicesModule {}
