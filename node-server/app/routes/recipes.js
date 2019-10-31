const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verify = require('./verifyToken');
const Item = require('../models/Item');
const unirest = require('unirest')


const url = "https://api.spoonacular.com/"



async function get_basic_pantry_item_name(name) {
	
	let requestString = "food/products/classify?apiKey="+process.env.API_KEY
	try {
	        unirest.post(url+requestString)
			.header("apiKey", process.env.API_KEY)
			.header('Content-Type', 'application/json')
			.send(
			{
				"title": name,
				"upc": "0", 
				"plu_code": "0" 
				
			}
			)
			.end(result=>{
				console.log(result.body.breadcrumbs);
				return res.send({
			            message: result.body.breadcrumbs
			        });
			})
	} catch (err) {
	        res.status(400).send({
	            message: err
	        });
	}
}

async function GetRecipe(req, res) {
    console.log("reached")
	
	let requestString = "recipes/findByIngredients?apiKey="+process.env.API_KEY



    try {
        const user = await User.findOne({
            _id: req.user._id
         })
        console.log(typeof (user.listOfItems))
        const values = Object.values(user.listOfItems)
        // const entries = Object.entries(user.listOfItems)

        console.log(values)
        breadcrumbs = []
        for (var property in values){

			const item = await Item.findOne({
            	_id: values[property]
        	 })

        	breadcrumbs.push.apply(breadcrumbs, item.breadcrumbs)
            
        }
       console.log(breadcrumbs)

         unirest.get(url+requestString)
			.header("apiKey", process.env.API_KEY)
			.header('Content-Type', 'application/json')
			.query({
				"ingredients": breadcrumbs,
				"number":5,
				"ranking":1
			})
			.end(result=>{
				console.log(result.body);
				return res.send({
			            message: result.body
			        });
			})
        

        
    } catch (err) {
        res.status(400).send({
            message: err
        })
    }


 
}



module.exports = {
   get_basic_pantry_item_name, 
   GetRecipe
};