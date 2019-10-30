const router = require('express').Router();
const verify = require('./verifyToken');
const User = require('../models/User');
const Item = require('../models/Item');
const unirest = require('unirest')


const {
    pairPiValidation,
    barCodeValidation
} = require('../validation');

async function pair(req, res) {

    const {
        error
    } = pairPiValidation(req.body);
    if (error) {
        return res.status(422).send({
            message: error.details[0].message
        });
    }

    const user = await User.findOne({
        _id: req.user._id
    })

    if (user.pairedDevices.includes(req.body.device)) {
        return res.status(400).send({
            message: 'Device already paired to this account'
        })
    }

    const listOfUsers = await User.find();
    // console.log(listOfUsers)

    for (i = 0; i < listOfUsers.length; i++) {
        // console.log(listOfUsers[i])
        if (listOfUsers[i].pairedDevices.includes(req.body.device)) {
            return res.status(400).send({
                message: 'Device already paired to a different account'
            })
        }
    }

    try {
        user.pairedDevices.push(req.body.device);
        const savedUser = await user.save();
        return res.send({
            message: "Device Added"
        });
    } catch (err) {
        res.status(400).send({
            message: err
        });
    }
}

async function unpair(req, res) {

    const {
        error
    } = pairPiValidation(req.body);
    if (error) {
        return res.status(422).send({
            message: error.details[0].message
        });
    }

    const user = await User.findOne({
        _id: req.user._id
    })

    if (!user.pairedDevices.includes(req.body.device)) {
        return res.status(404).send({
            message: 'Device not found'
        })
    }
    var index = user.pairedDevices.indexOf(req.body.device)
    if (index > -1) {
        user.pairedDevices.splice(index, 1);
    }

    try {
        const savedUser = await user.save();
        return res.send({
            message: "Device Removed"
        });
    } catch (err) {
        res.status(400).send({
            message: err
        });
    }
}

//do not delete for now. 
async function postBarCodeData1(req, res) {
    const {
        error
    } = barCodeValidation(req.body);
    if (error) {
        return res.status(422).send({
            message: error.details[0].message
        });
    }

    const user = await User.findOne({
        _id: req.user._id
    })

    // console.log(user.listOfItems);

    for (i = 0; i < user.listOfItems.length; i++) {
        // console.log(user.listOfItems[i]);
        const item = await Item.findOne({
            userID: user._id
        });
        // console.log(item == null);
        if (item != null && item.name == req.body.name) {
            if (req.body.flag == 1) {
                item.quantity = item.quantity + 1
            } else if (item.quantity == 0) {
                return res.status(400).send({
                    "message": "Item is out of stock"
                });
            } else {
                item.quantity = item.quantity - 1
            }
            if (item.quantity == 0) {
                item.status = false;
            }
            // console.log("Item exists")
            try {
                const savedItem = item.save();
                return res.send({
                    message: "Quantity Updated"
                });
            } catch (err) {
                return res.status(400).send({
                    message: err
                });
            }
        }
    }

    
    const newItem = new Item({
        name: req.body.name,
        status: true,
        quantity: 1,
        barCode: req.body.barCode,
        userID: user._id,
        //breadcrumbs: "breadcrumbsList"
    });

   

    try {
       

    // console.log(breadcrumbsList)

        const savedItem = await newItem.save();
        user.listOfItems.push(newItem);
        const savedUser = await user.save();
        // console.log("saved item")
        // console.log(breadcrumbsList)
        res.send({
            item: newItem._id,
            message: "Item Request received!"
        });
    } catch (err) {
        console.log("caught exception")

        res.status(400).send({
            message: err
        });
    }
}


async function postBarCodeData(req, res) {
    const {
        error
    } = barCodeValidation(req.body);
    if (error) {
        return res.status(422).send({
            message: error.details[0].message
        });
    }
 const user = await User.findOne({
        _id: req.user._id
    })
    for (i = 0; i < user.listOfItems.length; i++) {

        console.log(user.listOfItems[i]);
        const item = await Item.findOne({
            _id: user.listOfItems[i]
        });
        // console.log(item == null);
        if (item != null && item.name == req.body.name) {
            if (req.body.flag == 1) {
                item.quantity = item.quantity + 1
            } else if (item.quantity == 0) {
                return res.status(400).send({
                    "message": "Item is out of stock"
                });
            } else {
                item.quantity = item.quantity - 1
            }
            if (item.quantity == 0) {
                item.status = false;
            }
            // console.log("Item exists")
            try {
                const savedItem = item.save();
                return res.send({
                    message: "Quantity Updated"
                });
            } catch (err) {
                return res.status(400).send({
                    message: err
                });
            }
        }
    }


    let requestString = "https://api.spoonacular.com/food/products/classify?apiKey="+process.env.API_KEY


    try {
        console.log("name")
            unirest.post(requestString)
            .header("apiKey", process.env.API_KEY)
            .header('Content-Type', 'application/json')
            .send(
            {
                "title": req.body.name,
                "upc": "0", 
                "plu_code": "0" 
                
            }
            )
            .end(result=>{
                breadList = result.body.breadcrumbs
                // console.log(breadList);
                if(breadList.indexOf("non food item") >= 0){
                    breadList = []
                }
                const newItem = new Item({
                        name: req.body.name,
                        status: true,
                        quantity: 1,
                        barCode: req.body.barCode,
                        userID: user._id,
                        breadcrumbs: breadList
                    });

                    const savedItem =  newItem.save();
                    user.listOfItems.push(newItem._id);
                    const savedUser =  user.save();
                    // console.log("saved item")
                    // console.log(breadcrumbsList)
                    return res.send({
                        item: newItem._id,
                        message: "Item Request received!"
                     });
                   
            })
    } catch (err) {
        console.log("caught exception")
        console.log(err)

        res.status(400).send({
            message: err
        });
        // return  err
            
    }

}


async function getItems(req, res) {
    try {
        const listOfItems = await Item.find();
        return res.send(listOfItems);
    } catch (err) {
        res.status(400).send({
            message: err
        })
    }
}

async function getItem(req, res) {
    try {
        console.log(req.body.id)
        const item = await Item.findOne({
            _id: req.body.id
         })
        return res.send({
            item
        });
    } catch (err) {
        res.status(400).send({
            message: err
        })
    }
}

async function getMyItems(req, res) {
    try {
        const user = await User.findOne({
            _id: req.user._id
         })
        
         return res.send(user.listOfItems);
        
    } catch (err) {
        res.status(400).send({
            message: err
        })
    }
}

async function getMyItemsInfo(req, res) {
    try {
        const user = await User.findOne({
            _id: req.user._id
         })
        const values = Object.values(user.listOfItems)

        itemInfo = []
        for (var property in values){
             const item = await Item.findOne({
                _id: values[property]
             })
             itemInfo.push(item)
        }


        return res.send(itemInfo);


        
    } catch (err) {
        res.status(400).send({
            message: err
        })
    }
}




module.exports = {
    pair,
    unpair,
    postBarCodeData,
    getItems,
    getItem,
    getMyItems,
    getMyItemsInfo
};