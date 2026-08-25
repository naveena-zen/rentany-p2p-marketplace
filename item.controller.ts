import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { createItemSchema, searchItemsQuerySchema } from '../validators/item.validator';
import { AuthenticatedRequest } from '../middleware/auth';

export async function createItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Validate using Zod (including category attribute discriminated union)
    const data = createItemSchema.parse(req.body);

    const item = await prisma.item.create({
      data: {
        ownerId: req.user.userId,
        title: data.title,
        description: data.description,
        category: data.category as any,
        pricingUnit: data.pricingUnit as any,
        basePrice: data.basePrice,
        location: data.location,
        attributes: data.attributes as any,
        isActive: true,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, trustScore: true } },
      },
    });

    return res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function getItems(req: Request, res: Response, next: NextFunction) {
  try {
    const query = searchItemsQuerySchema.parse(req.query);

    const where: any = { isActive: true };

    if (query.category) {
      where.category = query.category;
    }
    if (query.pricingUnit) {
      where.pricingUnit = query.pricingUnit;
    }
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query.minPrice || query.maxPrice) {
      where.basePrice = {};
      if (query.minPrice) where.basePrice.gte = parseFloat(query.minPrice);
      if (query.maxPrice) where.basePrice.lte = parseFloat(query.maxPrice);
    }
    if (query.query) {
      where.OR = [
        { title: { contains: query.query, mode: 'insensitive' } },
        { description: { contains: query.query, mode: 'insensitive' } },
        { location: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, trustScore: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function getItemById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, trustScore: true } },
        bookings: {
          where: { status: 'CONFIRMED', endDate: { gte: new Date() } },
          select: { startDate: true, endDate: true },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    if (existing.ownerId !== req.user.userId && !req.user.roles.includes('ADMIN_ARBITRATOR')) {
      return res.status(403).json({ error: 'Forbidden: you do not own this item' });
    }

    const updated = await prisma.item.update({
      where: { id },
      data: req.body,
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    if (existing.ownerId !== req.user.userId && !req.user.roles.includes('ADMIN_ARBITRATOR')) {
      return res.status(403).json({ error: 'Forbidden: you do not own this item' });
    }

    await prisma.item.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ message: 'Item deactivated successfully' });
  } catch (err) {
    next(err);
  }
}
