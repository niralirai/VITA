const User = require('../models/User');
const Item = require('../models/Item');
const unirest = require('unirest')


const {
    pairPiValidation,
    barCodeValidation,
    deleteItemValidation,
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

async function postBarCodeData(req, res) {
    const {
        error
    } = barCodeValidation(req.body);
    if (error) {
        return res.status(422).send({
            message: error.details[0].message
        });
    }
    // console.log(req.user)
    // const user = await User.findOne({
    //     _id: req.user._id
    // })
    const user = await User.findOne({
        pairedDevices: req.body.scannerID
    });
    if (user == null) {
        return res.status(400).send({
            "message": "This device is not paired with any user"
        });
    }
    // console.log(user);

    const item = await Item.findOne({
        userID: user._id,
        name: req.body.name
    });
    // console.log(item)
    if (item != null) {
        var d = new Date();
        if (req.body.flag == 1) {
            item.quantity = item.quantity + 1
            item.status = true;
            item.date = d.getTime();
            item.added.push(d.getTime())
        } else if (item.quantity == 0) {
            return res.status(400).send({
                "message": "Item is out of stock"
            });
        } else {
            item.quantity = item.quantity - 1
            item.date = d.getTime();
        }
        if (item.quantity == 0) {
            item.status = false;
            var date1 = new Date();
            var Difference_In_Time = date1.getTime() - item.date;
            console.log(Difference_In_Time)
            item.lasted.push(Difference_In_Time);
        }
        // console.log("Item exists")
        try {
            const savedItem = item.save();
            return res.status(200).send({
                item: item._id,
                message: "Quantity Updated"
            });
        } catch (err) {
            return res.status(400).send({
                message: err
            });
        }
    }

    let requestString = "https://api.spoonacular.com/food/products/classify?apiKey=" + process.env.API_KEY

    try {
        unirest.post(requestString)
            .header("apiKey", process.env.API_KEY)
            .header('Content-Type', 'application/json')
            .send({
                "title": req.body.name,
                "upc": "0",
                "plu_code": "0"

            })
            .end(result => {
                breadList = result.body.breadcrumbs

                // console.log(breadList);
                if (breadList.indexOf("non food item") >= 0) {
                    breadList = []
                }
                breadList.push(result.body.category)

                var d = new Date();
                const newItem = new Item({
                    name: req.body.name,
                    status: true,
                    quantity: 1,
                    barCode: req.body.barCode,
                    userID: user._id,
                    breadcrumbs: breadList,
                    added: [d.getTime()]
                });

                const savedItem = newItem.save();
                user.listOfItems.push(newItem._id);
                const savedUser = user.save();
                // console.log("saved item")
                // console.log(breadcrumbsList)
                return res.status(200).send({
                    item: newItem._id,
                    message: "Item Request received!"
                });

            })
    } catch (err) {
        // console.log("caught exception")
        // console.log(err)

        res.status(400).send({
            message: err
        });
        // return  err
    }

}


//get all items across the app 
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
//get informatio on a specific item
async function getItem(req, res) {
    try {
        // console.log(req.body.id)
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
//get list of my items' ids
async function getMyItems(req, res) {
    try {
        const user = await User.findOne({
            _id: req.user._id
        })

        return res.send(user.listOfItems);
    } catch (err) {
        return res.status(400).send({
            message: err
        })
    }
}
async function deleteItem(req, res) {
    const {
        error
    } = deleteItemValidation(req.body);
    if (error) {
        return res.status(422).send({
            message: error.details[0].message
        });
    }

    try {
        const item = await Item.findOne({
            userID: req.user._id,
            name: req.body.name
        });

        const user = await User.findOne({
            _id: req.user._id
        })

        if (item != null) {
            await item.delete();
            var index = user.listOfItems.indexOf(item._id);
            if (index > -1) {
                user.listOfItems.splice(index, 1);
            }
            await user.save();
            return res.send({
                message: "Item Deleted"
            });
        }
        return res.send({
            message: "Unable to find item"
        });

    } catch (err) {
        return res.status(400).send({
            message: err
        })
    }
}
//get list of my scanners
async function pairedScanners(req, res) {
    try {
        const user = await User.findOne({
            _id: req.user._id
        })

        return res.send({
            devices: user.pairedDevices
        });

    } catch (err) {
        res.status(400).send({
            message: err
        })
    }
}
//get list of my items' object
async function getMyItemsInfo(req, res) {
    try {
        const user = await User.findOne({
            _id: req.user._id
        })
        const values = Object.values(user.listOfItems)

        itemInfo = []
        itemInfoprint = []
        console.log(user.listOfItems)
        for (var property in values) {
            const item = await Item.findOne({
                _id: values[property]
            })
            
           if (item.status) {
                itemInfo.push(item)
           }
            itemInfoprint.push(item)

        }
        console.log("---")
        console.log(itemInfo)
        console.log("---")

        return res.send(itemInfo);

    } catch (err) {
        console.log(err)
        res.status(400).send({
            message: err
        })
    }
}
//get list of my items' object
async function findMyItems(req, res) {
    try {
        const user = await User.findOne({
            _id: req.user._id
        })
        const values = Object.values(user.listOfItems)
        // console.log(user.listOfItems)
        if (user.listOfItems.includes(req.body.item_id)) {
            const item = await Item.findOne({
                _id: req.body.item_id
            })
            if (item.status == true) {

                return res.send({
                    found: true,
                    item: item
                });
            }
        }
        return res.send({
            found: false
        });


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
    getMyItemsInfo,
    findMyItems,
    pairedScanners,
    deleteItem
};