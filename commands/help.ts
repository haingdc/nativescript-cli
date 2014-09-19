///<reference path="../../.d.ts"/>
"use strict";

import path = require("path");
import util = require("util");
import commandParams = require("../command-params");

export class HelpCommand implements ICommand {
	constructor(private $logger: ILogger,
		private $injector: IInjector,
		private $errors: IErrors,
		private $fs: IFileSystem,
		private $staticConfig: Config.IStaticConfig) {}

	public enableHooks = false;
	public allowedParameters: ICommandParameter[] = [new commandParams.StringCommandParameter(), new commandParams.StringCommandParameter()];

	public execute(args: string[]): IFuture<void> {
		return (() => {
			var topic = (args[0] || "").toLowerCase();
			if (topic === "help") {
				topic = "";
			}

			if(args[1]) {
				topic = util.format("%s|%s", args[0], args[1]);
			}

			var helpContent = this.$fs.readText(this.$staticConfig.helpTextPath).wait();

			var pattern = util.format("--\\[%s\\]--((.|[\\r\\n])+?)--\\[/\\]--", (<any>RegExp).escape(topic));
			var regex = new RegExp(pattern);

			var match = regex.exec(helpContent);
			if (match) {
				var helpText = match[1].trim();

				var substitutionPoint: any;
				while (substitutionPoint = helpText.match(this.$injector.dynamicCallRegex)) {
					this.$logger.trace(substitutionPoint);
					var data = this.$injector.dynamicCall(substitutionPoint[0]).wait();

					var pointStart = substitutionPoint.index;
					var pointEnd = pointStart + substitutionPoint[0].length;
					helpText = helpText.substr(0, pointStart) + data + helpText.substr(pointEnd);
				}

				this.$logger.out(helpText);
			} else {
				this.$errors.fail({ formatStr: "Unknown help topic '%s'", suppressCommandHelp: true }, topic);
			}
		}).future<void>()();
	}
}
$injector.registerCommand(["help", "/?"], HelpCommand);