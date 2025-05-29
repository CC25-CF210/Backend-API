const fs = require('fs');
const path = require('path');
const { db } = require('../config/firebase');
const { nanoid } = require('nanoid');

function formatImgUrls(inputString) {
    if (!inputString || typeof inputString !== 'string') {
        return null;
    }
    
    const cleanInput = inputString.replace(/\\\//g, '/');
    
    const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
    
    const formattedUrls = imageUrls.map(url => url.trim().replace(/^"|"$/g, ''));
    
    const result = [];
    formattedUrls.forEach((url, index) => {
        if (url && url.startsWith('http')) {
            result.push(`[Index ${index}] "${url}"`);
        }
    });
    
    return result.length > 0 ? result : null;
}

function formatKeywords(inputString) {
    if (!inputString || typeof inputString !== 'string') {
        return [];
    }
    
    const keywords = inputString.split(',').map(keyword => keyword.trim());
    
    const result = [];
    keywords.forEach((keyword, index) => {
        if (keyword) {
            result.push(`[Index ${index}] "${keyword}"`);
        }
    });
    
    return result;
}

function formatIngredients(inputString) {
    if (!inputString || typeof inputString !== 'string') {
        return [];
    }
    
    const ingredients = inputString.split(',').map(ingredient => ingredient.trim());
    
    const result = [];
    ingredients.forEach((ingredient, index) => {
        if (ingredient) {
            result.push(`[Index ${index}] "${ingredient}"`);
        }
    });
    
    return result;
}

function getFirstImageUrl(inputString) {
    if (!inputString || typeof inputString !== 'string') {
        return null;
    }
    
    const cleanInput = inputString.replace(/\\\//g, '/');
    
    const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
    
    const firstUrl = imageUrls[0];
    if (firstUrl && firstUrl.trim()) {
        return firstUrl.trim().replace(/^"|"$/g, '');
    }
    
    return null;
}

function getKeywordsArray(inputString) {
    if (!inputString || typeof inputString !== 'string') {
        return [];
    }
    
    return inputString.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);
}

function getIngredientsArray(inputString) {
    if (!inputString || typeof inputString !== 'string') {
        return [];
    }
    
    return inputString.split(',').map(ingredient => ingredient.trim()).filter(ingredient => ingredient);
}

function getAllImageUrls(inputString) {
    if (!inputString || typeof inputString !== 'string') {
        return [];
    }
    
    const cleanInput = inputString.replace(/\\\//g, '/');
    
    const imageUrls = cleanInput.split(/,\s*(?=https?:\/\/)/);
    
    return imageUrls
        .map(url => url.trim().replace(/^"|"$/g, ''))
        .filter(url => url && url.startsWith('http'));
}

function convertRecipeToFood(recipe) {
    const timestamp = new Date().toISOString();
    const id = nanoid(16);
    
    const servings = recipe.RecipeServings || 1;
    
    return {
        id: id,
        food_name: recipe.Name || 'Unknown Recipe',
        calories_per_serving: Math.round((recipe.Calories || 0) / servings),
        protein_per_serving: parseFloat(((recipe.ProteinContent || 0) / servings).toFixed(2)),
        carbs_per_serving: parseFloat(((recipe.CarbohydrateContent || 0) / servings).toFixed(2)),
        fat_per_serving: parseFloat(((recipe.FatContent || 0) / servings).toFixed(2)),
        serving_size: 1,
        serving_unit: 'porsi',
        fatsecret_id: null,
        image_url: getFirstImageUrl(recipe.Images),
        is_verified: true, 
        created_at: timestamp,
        updated_at: timestamp,
        recipe_metadata: {
            original_recipe_id: recipe.RecipeId,
            cook_time: recipe.CookTime || 0,
            prep_time: recipe.PrepTime || 0,
            total_time: recipe.TotalTime || 0,
            servings: recipe.RecipeServings || 1,
            keywords: getKeywordsArray(recipe.Keywords),
            ingredients: getIngredientsArray(recipe.RecipeIngredientParts),
            cuisine: recipe.Cuisine || 'Other',
            meal_type: recipe.MealType || 'Main',
            diet_type: recipe.DietType || [],
            all_images: getAllImageUrls(recipe.Images), 
            total_nutrition: {
                calories: recipe.Calories || 0,
                protein: recipe.ProteinContent || 0,
                carbs: recipe.CarbohydrateContent || 0,
                fat: recipe.FatContent || 0,
                saturated_fat: recipe.SaturatedFatContent || 0,
                cholesterol: recipe.CholesterolContent || 0,
                sodium: recipe.SodiumContent || 0,
                fiber: recipe.FiberContent || 0,
                sugar: recipe.SugarContent || 0
            }
        }
    };
}

function validateRecipe(recipe) {
    const errors = [];
    
    if (!recipe.Name || recipe.Name.trim() === '') {
        errors.push('Missing or empty name');
    }
    
    const imageUrl = getFirstImageUrl(recipe.Images);
    if (!imageUrl || imageUrl.trim() === '') {
        errors.push('Missing or empty image URL');
    }
    
    if (!recipe.Calories || recipe.Calories <= 0) {
        errors.push('Invalid calories');
    }
    
    if (!recipe.RecipeServings || recipe.RecipeServings <= 0) {
        errors.push('Invalid servings');
    }
    
    return errors;
}

async function analyzeJsonFile(jsonFilePath) {
    try {
        console.log('=== ANALYZING JSON FILE ===');
        console.log(`File: ${jsonFilePath}\n`);
        
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const recipes = JSON.parse(jsonData);
        
        console.log(`Total recipes in file: ${recipes.length}`);
        
        let validCount = 0;
        let invalidCount = 0;
        let noImageCount = 0;
        let validRecipes = [];
        
        const invalidReasons = {};
        
        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];
            const errors = validateRecipe(recipe);
            
            if (errors.length === 0) {
                validCount++;
                validRecipes.push({
                    index: i,
                    recipe: recipe
                });
            } else {
                invalidCount++;
                
                errors.forEach(error => {
                    if (error.includes('image')) noImageCount++;
                    invalidReasons[error] = (invalidReasons[error] || 0) + 1;
                });
            }
        }
        
        console.log('\n=== ANALYSIS RESULTS ===');
        console.log(`✅ Valid recipes (will be imported): ${validCount}`);
        console.log(`❌ Invalid recipes (will be skipped): ${invalidCount}`);
        console.log(`🖼️  Recipes without images: ${noImageCount}`);
        console.log(`📊 Success rate: ${Math.round((validCount/recipes.length)*100)}%`);
        
        if (Object.keys(invalidReasons).length > 0) {
            console.log('\n=== INVALID REASONS ===');
            Object.entries(invalidReasons).forEach(([reason, count]) => {
                console.log(`   ${reason}: ${count} recipes`);
            });
        }
        
        console.log('\n=== FIREBASE WRITES ESTIMATION ===');
        console.log(`Total writes needed: ${validCount}`);
        console.log(`Recommended batch size: 100-500 (to avoid rate limits)`);
        console.log(`Estimated batches (batch size 100): ${Math.ceil(validCount/100)}`);
        
        return {
            total: recipes.length,
            valid: validCount,
            invalid: invalidCount,
            noImage: noImageCount,
            validRecipes: validRecipes
        };
        
    } catch (error) {
        console.error('Error analyzing file:', error);
        throw error;
    }
}

async function importFoodBatch(jsonFilePath, startIndex = 0, batchSize = 100, endIndex = null) {
    try {
        console.log('=== BATCH IMPORT ===');
        console.log(`File: ${jsonFilePath}`);
        console.log(`Start index: ${startIndex}`);
        console.log(`Batch size: ${batchSize}`);
        console.log(`End index: ${endIndex || 'auto'}\n`);
        
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const recipes = JSON.parse(jsonData);
        
        const validRecipes = [];
        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];
            const errors = validateRecipe(recipe);
            if (errors.length === 0) {
                validRecipes.push({
                    originalIndex: i,
                    recipe: recipe
                });
            }
        }
        
        console.log(`Total valid recipes available: ${validRecipes.length}`);
        
        const actualEndIndex = endIndex ? Math.min(endIndex, startIndex + batchSize - 1) : startIndex + batchSize - 1;
        const batchToImport = validRecipes.slice(startIndex, actualEndIndex + 1);
        
        if (batchToImport.length === 0) {
            console.log('❌ No recipes to import in this range');
            return {
                processed: 0,
                success: 0,
                errors: 0,
                nextIndex: startIndex
            };
        }
        
        console.log(`Importing recipes ${startIndex} to ${startIndex + batchToImport.length - 1} (${batchToImport.length} recipes)`);
        console.log('Starting import...\n');
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (let i = 0; i < batchToImport.length; i++) {
            const { originalIndex, recipe } = batchToImport[i];
            const currentIndex = startIndex + i;
            
            try {
                const foodData = convertRecipeToFood(recipe);
                
                await db.collection('food_items').doc(foodData.id).set(foodData);
                
                successCount++;
                console.log(`✅ [${currentIndex + 1}/${validRecipes.length}] ${recipe.Name} (Original index: ${originalIndex})`);
                
            } catch (error) {
                errorCount++;
                const errorMsg = `❌ [${currentIndex + 1}/${validRecipes.length}] ${recipe.Name}: ${error.message}`;
                console.log(errorMsg);
                errors.push(errorMsg);
            }
            
            if (i < batchToImport.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        const nextIndex = startIndex + batchToImport.length;
        const hasMore = nextIndex < validRecipes.length;
        
        console.log('\n=== BATCH IMPORT SUMMARY ===');
        console.log(`Processed: ${batchToImport.length}`);
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`Success rate: ${Math.round((successCount/batchToImport.length)*100)}%`);
        console.log(`Next index: ${nextIndex}${hasMore ? '' : ' (completed)'}`);
        console.log(`Remaining: ${hasMore ? validRecipes.length - nextIndex : 0} recipes`);
        
        if (errors.length > 0) {
            console.log('\n=== ERRORS ===');
            errors.forEach(error => console.log(error));
        }
        
        return {
            processed: batchToImport.length,
            success: successCount,
            errors: errorCount,
            nextIndex: nextIndex,
            hasMore: hasMore,
            totalRemaining: hasMore ? validRecipes.length - nextIndex : 0
        };
        
    } catch (error) {
        console.error('Error during batch import:', error);
        throw error;
    }
}

async function getImportProgress(jsonFilePath) {
    try {
        const analysis = await analyzeJsonFile(jsonFilePath);
        
        const snapshot = await db.collection('food_items').get();
        const importedCount = snapshot.size;
        
        console.log('\n=== IMPORT PROGRESS ===');
        console.log(`Total valid recipes: ${analysis.valid}`);
        console.log(`Already imported: ${importedCount}`);
        console.log(`Remaining: ${analysis.valid - importedCount}`);
        console.log(`Progress: ${Math.round((importedCount/analysis.valid)*100)}%`);
        
        return {
            total: analysis.valid,
            imported: importedCount,
            remaining: analysis.valid - importedCount,
            progress: Math.round((importedCount/analysis.valid)*100)
        };
        
    } catch (error) {
        console.error('Error getting progress:', error);
        throw error;
    }
}

async function clearExistingData() {
    try {
        console.log('Menghapus data existing...');
        
        const snapshot = await db.collection('food_items').get();
        const batchSize = 100;
        let deletedCount = 0;
        
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = snapshot.docs.slice(i, i + batchSize);
            
            batchDocs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            deletedCount += batchDocs.length;
            console.log(`Deleted ${deletedCount}/${snapshot.docs.length} documents`);
        }
        
        console.log(`Successfully deleted ${deletedCount} existing documents`);
        
    } catch (error) {
        console.error('Error clearing existing data:', error);
        throw error;
    }
}

async function main() {
    try {
        const command = process.argv[2];
        const jsonFilePath = process.argv[3];
        
        if (!jsonFilePath && command !== 'help') {
            console.error('Usage: node importFoods.js <command> <path-to-json-file> [options]');
            console.error('Run "node importFoods.js help" for more information');
            process.exit(1);
        }
        
        if (jsonFilePath && !fs.existsSync(jsonFilePath)) {
            console.error(`File not found: ${jsonFilePath}`);
            process.exit(1);
        }
        
        switch (command) {
            case 'analyze':
                await analyzeJsonFile(jsonFilePath);
                break;
                
            case 'import-batch':
                const startIndex = parseInt(process.argv[4]) || 0;
                const batchSize = parseInt(process.argv[5]) || 100;
                const endIndex = process.argv[6] ? parseInt(process.argv[6]) : null;
                
                await importFoodBatch(jsonFilePath, startIndex, batchSize, endIndex);
                break;
                
            case 'progress':
                await getImportProgress(jsonFilePath);
                break;
                
            case 'clear':
                const readline = require('readline').createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                
                const confirmClear = await new Promise(resolve => {
                    readline.question('Are you sure you want to clear all existing food_items data? (y/N): ', answer => {
                        readline.close();
                        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
                    });
                });
                
                if (confirmClear) {
                    await clearExistingData();
                } else {
                    console.log('Clear operation cancelled');
                }
                break;
                
            case 'help':
            default:
                console.log('Usage: node importFoods.js <command> <json-file> [options]');
                console.log('');
                console.log('Commands:');
                console.log('  analyze <file>                    - Analyze JSON file and show import statistics');
                console.log('  import-batch <file> [start] [size] [end] - Import specific batch');
                console.log('    start: Starting index (default: 0)');
                console.log('    size:  Batch size (default: 100)');
                console.log('    end:   End index (optional)');
                console.log('  progress <file>                   - Show current import progress');
                console.log('  clear                            - Clear all existing food_items data');
                console.log('  help                             - Show this help');
                console.log('');
                console.log('Examples:');
                console.log('  node importFoods.js analyze ./data/recipes.json');
                console.log('  node importFoods.js import-batch ./data/recipes.json 0 50');
                console.log('  node importFoods.js import-batch ./data/recipes.json 50 100');
                console.log('  node importFoods.js progress ./data/recipes.json');
                console.log('  node importFoods.js clear');
                break;
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('Operation failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    importFoodBatch,
    convertRecipeToFood,
    formatImgUrls,
    formatKeywords,
    formatIngredients,
    getFirstImageUrl,
    getKeywordsArray,
    getIngredientsArray,
    getAllImageUrls,
    clearExistingData,
    analyzeJsonFile,
    getImportProgress,
    validateRecipe
};