"""Product routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from database import db
from models import Product, ProductCreate
from auth_utils import get_current_user, get_user_product_ids, check_permission

router = APIRouter(tags=["Products"])

@router.post("/products", response_model=Product)
async def create_product(data: ProductCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Products (Create)")
    
    product = Product(**data.model_dump())
    await db.products.insert_one(product.model_dump())
    return product

@router.get("/products", response_model=List[Product])
async def get_products(current_user: dict = Depends(get_current_user)):
    """Get all products - filtered by user's product access"""
    await check_permission(current_user, "Products (View)")
    # Get user's accessible product IDs
    product_ids = await get_user_product_ids(current_user)
    
    if product_ids is None:
        # User has access to all products (Master Admin or Admin with no restrictions)
        return await db.products.find({}, {"_id": 0}).to_list(1000)
    
    if not product_ids:
        # User has no product access
        return []
    
    # Filter by user's accessible products
    return await db.products.find({"id": {"$in": product_ids}}, {"_id": 0}).to_list(1000)

@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific product - checks user's product access"""
    await check_permission(current_user, "Products (View)")
    # Check if user has access to this product
    product_ids = await get_user_product_ids(current_user)
    
    if product_ids is not None and product_id not in product_ids:
        raise HTTPException(status_code=403, detail="You don't have access to this product")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, data: ProductCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Products (Update)")
    
    await db.products.update_one({"id": product_id}, {"$set": data.model_dump()})
    return await db.products.find_one({"id": product_id}, {"_id": 0})

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Products (Delete)")
    
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted"}
