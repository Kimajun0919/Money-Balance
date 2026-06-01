import { PrismaClient } from "@prisma/client";
import { ASSET_TYPE_ORDER, ASSET_TYPE_SETTINGS } from "../src/lib/constants/asset-types";
import { TARGET_ALLOCATION_TEMPLATES } from "../src/lib/constants/target-allocation-matrix";
import { TAX_RATE_SETTINGS } from "../src/lib/constants/tax-rates";

const prisma = new PrismaClient();

async function seedAssetTypeSettings() {
  for (const setting of Object.values(ASSET_TYPE_SETTINGS)) {
    await prisma.assetTypeSetting.upsert({
      where: { asset_type: setting.assetType },
      update: {
        default_income_yield: setting.defaultIncomeYield,
        default_capital_return: setting.defaultCapitalReturn,
        default_expected_return: setting.defaultExpectedReturn,
        risk_coefficient: setting.riskCoefficient,
        default_risk_level: setting.riskLevel,
        default_liquidity_level: setting.liquidityLevel,
        liquidity_score: setting.liquidityScore,
        description: setting.description,
        is_active: setting.isActive
      },
      create: {
        asset_type: setting.assetType,
        default_income_yield: setting.defaultIncomeYield,
        default_capital_return: setting.defaultCapitalReturn,
        default_expected_return: setting.defaultExpectedReturn,
        risk_coefficient: setting.riskCoefficient,
        default_risk_level: setting.riskLevel,
        default_liquidity_level: setting.liquidityLevel,
        liquidity_score: setting.liquidityScore,
        description: setting.description,
        is_active: setting.isActive
      }
    });
  }
}

async function seedTargetAllocationTemplates() {
  for (const template of TARGET_ALLOCATION_TEMPLATES) {
    const savedTemplate = await prisma.targetAllocationTemplate.upsert({
      where: {
        target_return_band_risk_tolerance_template_version: {
          target_return_band: template.targetReturnBand,
          risk_tolerance: template.riskTolerance,
          template_version: template.templateVersion
        }
      },
      update: {
        expected_return: template.expectedReturn,
        composition_risk: template.compositionRisk,
        is_active: template.isActive,
        created_by: "seed"
      },
      create: {
        target_return_band: template.targetReturnBand,
        risk_tolerance: template.riskTolerance,
        expected_return: template.expectedReturn,
        composition_risk: template.compositionRisk,
        template_version: template.templateVersion,
        is_active: template.isActive,
        created_by: "seed"
      }
    });

    await prisma.targetAllocationItem.deleteMany({
      where: { template_id: savedTemplate.id }
    });

    await prisma.targetAllocationItem.createMany({
      data: template.allocations.map((allocation) => ({
        template_id: savedTemplate.id,
        asset_type: allocation.assetType,
        target_ratio: allocation.targetRatio,
        min_ratio: allocation.minRatio ?? Math.max(0, allocation.targetRatio - 0.03),
        max_ratio: allocation.maxRatio ?? Math.min(1, allocation.targetRatio + 0.03)
      }))
    });
  }
}

async function seedTaxRateSettings() {
  for (const setting of TAX_RATE_SETTINGS) {
    const assetTypes = setting.assetType === "all" ? ASSET_TYPE_ORDER : [setting.assetType];

    for (const assetType of assetTypes) {
      await prisma.taxRateSetting.upsert({
        where: {
          account_type_asset_type: {
            account_type: setting.accountType,
            asset_type: assetType
          }
        },
        update: {
          income_tax_rate: setting.incomeTaxRate,
          capital_gain_tax_rate: setting.capitalGainTaxRate,
          description: setting.description,
          is_active: setting.isActive
        },
        create: {
          account_type: setting.accountType,
          asset_type: assetType,
          income_tax_rate: setting.incomeTaxRate,
          capital_gain_tax_rate: setting.capitalGainTaxRate,
          description: setting.description,
          is_active: setting.isActive
        }
      });
    }
  }
}

async function main() {
  await seedAssetTypeSettings();
  await seedTargetAllocationTemplates();
  await seedTaxRateSettings();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
